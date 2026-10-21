import { Prisma, type Training } from "@prisma/client";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import {
  dateKeyToDate,
  getBrazilDateKey,
  isBlockedTrainingDate,
  isOfficialTrainingDate,
  loadBlockedDates,
  loadTrainingSchedule,
  resolveTrainingMeta,
  toTrainingDateKey,
  turmasForDate,
} from "../../utils/trainingDates";
import { googleCalendarService } from "../google-calendar/google-calendar.service";

const UPCOMING_WINDOW_DAYS = 21;
let lastAutoCreateRun: number | null = null;
const AUTO_CREATE_THROTTLE_MS = 5 * 60 * 1000;

function addDaysToKey(dateKey: string, days: number): string {
  const d = dateKeyToDate(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return toTrainingDateKey(d);
}

/**
 * Garante que exista um registro de Training (mesmo que vazio, sem plano
 * ainda) para cada data oficial de cada turma nas próximas semanas — sem
 * isso, "Próximos Treinos" no dashboard nunca tem o que mostrar até um
 * técnico preencher um plano manualmente.
 */
async function ensureUpcomingTrainings() {
  const now = Date.now();
  if (lastAutoCreateRun && now - lastAutoCreateRun < AUTO_CREATE_THROTTLE_MS) return;
  lastAutoCreateRun = now;

  const schedule = await loadTrainingSchedule();
  const todayKey = getBrazilDateKey();

  const wanted: Array<{ dateKey: string; turmaId: string | null; title: string; category: string | null }> = [];

  for (let i = 0; i <= UPCOMING_WINDOW_DAYS; i++) {
    const dateKey = addDaysToKey(todayKey, i);
    if (!isOfficialTrainingDate(dateKey, schedule.blockedDates, schedule.legacyDaysOfWeek, schedule.turmas)) {
      continue;
    }

    const turmasToday = turmasForDate(dateKey, schedule.turmas);

    if (turmasToday.length === 0) {
      const meta = resolveTrainingMeta(dateKey, null, schedule);
      wanted.push({ dateKey, turmaId: null, title: "Treino Oficial", category: meta.label });
      continue;
    }

    for (const turma of turmasToday) {
      wanted.push({ dateKey, turmaId: turma.id, title: `Treino Oficial — ${turma.name}`, category: turma.name });
    }
  }

  if (wanted.length === 0) return;

  const minDate = dateKeyToDate(wanted[0].dateKey);
  const maxDate = dateKeyToDate(wanted[wanted.length - 1].dateKey);

  const existing = await prisma.training.findMany({
    where: { date: { gte: minDate, lte: maxDate } },
    select: { date: true, turmaId: true },
  });
  const existingKeys = new Set(existing.map((t) => `${toTrainingDateKey(t.date)}|${t.turmaId ?? ""}`));

  const toCreate = wanted.filter((w) => !existingKeys.has(`${w.dateKey}|${w.turmaId ?? ""}`));
  if (toCreate.length === 0) return;

  await prisma.training.createMany({
    data: toCreate.map((w) => ({
      date: dateKeyToDate(w.dateKey),
      title: w.title,
      category: w.category,
      turmaId: w.turmaId,
      createdBy: "Sistema",
    })),
  });
}

type TrainingFilters = {
  category?: string;
  month?: string;
  search?: string;
};

type TrainingPayload = {
  date?: string;
  title?: string;
  category?: string | null;
  objective?: string | null;
  warmup?: string | null;
  fundamentals?: string | null;
  mainPart?: string | null;
  reducedGame?: string | null;
  finalPart?: string | null;
  notes?: string | null;
  createdBy?: string;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: string | undefined, required: boolean, blockedDates: string[]) {
  if (!value) {
    if (required) throw new AppError("Data do treino é obrigatória", 400);
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Data do treino inválida", 400);
  }

  if (isBlockedTrainingDate(date, blockedDates)) {
    throw new AppError("Esta data está bloqueada para treinos oficiais Pegasus.", 400);
  }

  return date;
}

function parseMonth(month?: string) {
  if (!month) return undefined;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError("Mês deve estar no formato YYYY-MM", 400);
  }

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return { start, end };
}

function buildWhere(filters: TrainingFilters) {
  const where: Prisma.TrainingWhereInput = {};
  const monthRange = parseMonth(filters.month);

  if (filters.category) {
    where.category = filters.category;
  }

  if (monthRange) {
    where.date = {
      gte: monthRange.start,
      lt: monthRange.end,
    };
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { objective: { contains: search, mode: "insensitive" } },
      { fundamentals: { contains: search, mode: "insensitive" } },
      { mainPart: { contains: search, mode: "insensitive" } },
      { reducedGame: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildData(payload: TrainingPayload, requireBaseFields: boolean, blockedDates: string[]) {
  const data: Prisma.TrainingUncheckedCreateInput | Prisma.TrainingUncheckedUpdateInput = {};

  if (requireBaseFields && !payload.title?.trim()) {
    throw new AppError("Título do treino é obrigatório", 400);
  }

  if (requireBaseFields && !payload.createdBy?.trim()) {
    throw new AppError("Criado por é obrigatório", 400);
  }

  const date = parseDate(payload.date, requireBaseFields, blockedDates);
  if (date !== undefined) data.date = date;

  if (payload.title !== undefined) {
    const title = payload.title.trim();

    if (!title) {
      throw new AppError("Título do treino é obrigatório", 400);
    }

    data.title = title;
  }

  if (payload.createdBy !== undefined) {
    const createdBy = payload.createdBy.trim();

    if (!createdBy) {
      throw new AppError("Criado por é obrigatório", 400);
    }

    data.createdBy = createdBy;
  }

  if (payload.category !== undefined) data.category = normalizeOptional(payload.category);
  if (payload.objective !== undefined) data.objective = normalizeOptional(payload.objective);
  if (payload.warmup !== undefined) data.warmup = normalizeOptional(payload.warmup);
  if (payload.fundamentals !== undefined) {
    data.fundamentals = normalizeOptional(payload.fundamentals);
  }
  if (payload.mainPart !== undefined) data.mainPart = normalizeOptional(payload.mainPart);
  if (payload.reducedGame !== undefined) data.reducedGame = normalizeOptional(payload.reducedGame);
  if (payload.finalPart !== undefined) data.finalPart = normalizeOptional(payload.finalPart);
  if (payload.notes !== undefined) data.notes = normalizeOptional(payload.notes);

  return data;
}

function formatPdfDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

async function generateTrainingPdfBuffer(training: Training): Promise<Buffer> {
  const setting = await prisma.trainingSetting.findUnique({ where: { id: "singleton" }, select: { systemName: true } });
  const orgName = setting?.systemName ?? "Pegasus Manager";

  const W = 595.28;
  const H = 841.89;
  const ML = 40;
  const MR = 40;
  const contentW = W - ML - MR;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margins: { top: ML, bottom: 40, left: ML, right: MR }, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Mesma paleta preto + verde do demonstrativo financeiro (reports.service.ts).
    const ink = "#18181b";
    const gray = "#71717a";
    const grayLight = "#a1a1aa";
    const surface = "#f4f4f5";
    const border = "#e4e4e7";
    const emerald = "#16a34a";

    doc.rect(0, 0, W, 72).fill(ink);
    doc.rect(0, 72, W, 3).fill(emerald);
    doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text(orgName, ML, 16, { lineBreak: false });
    const pillLabel = `TREINO · ${formatPdfDate(training.date).toUpperCase()}`;
    const pillW = doc.font("Helvetica-Bold").fontSize(8.5).widthOfString(pillLabel, { characterSpacing: 0.6 }) + 20;
    doc.roundedRect(ML, 42, pillW, 18, 9).fill("#134e2f");
    doc.fillColor("#86efac").font("Helvetica-Bold").fontSize(8.5).text(pillLabel, ML + 10, 47, { lineBreak: false, characterSpacing: 0.6 });

    let y = 100;

    function ensureSpace(minHeight: number) {
      if (y + minHeight > H - 60) {
        doc.addPage();
        y = ML;
      }
    }

    function sectionTitle(title: string) {
      const label = title.toUpperCase();
      const textW = doc.font("Helvetica-Bold").fontSize(9.5).widthOfString(label, { characterSpacing: 0.6 });
      ensureSpace(50);
      doc.roundedRect(ML, y, textW + 24, 21, 10.5).fill(surface);
      doc.circle(ML + 12, y + 10.5, 3).fill(emerald);
      doc.fillColor(ink).font("Helvetica-Bold").fontSize(9.5).text(label, ML + 20, y + 6, { lineBreak: false, characterSpacing: 0.6 });
      y += 21;
      doc.moveTo(ML, y + 7).lineTo(ML + contentW, y + 7).strokeColor(border).lineWidth(0.75).stroke();
      y += 17;
    }

    function paragraph(text: string) {
      doc.font("Helvetica").fontSize(10).fillColor(ink);
      const height = doc.heightOfString(text, { width: contentW, lineGap: 3 });
      ensureSpace(height + 10);
      doc.text(text, ML, y, { width: contentW, lineGap: 3 });
      y += height + 18;
    }

    function block(title: string, text: string | null) {
      if (!text?.trim()) return;
      sectionTitle(title);
      paragraph(text.trim());
    }

    // ── Cabeçalho do treino ───────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(15).fillColor(ink).text(training.title, ML, y, { width: contentW });
    y += doc.heightOfString(training.title, { width: contentW }) + 4;
    const metaParts = [training.category, `Criado por ${training.createdBy}`].filter(Boolean);
    doc.font("Helvetica").fontSize(9.5).fillColor(gray).text(metaParts.join(" · "), ML, y, { width: contentW, lineBreak: false });
    y += 26;

    // ── Blocos do treino ──────────────────────────────────────────────────────
    block("Aquecimento", training.warmup);
    block("Fundamentos", training.fundamentals);
    block("Parte principal", training.mainPart);
    block("Parte final", training.finalPart);
    block("Observações", training.notes);

    if (![training.warmup, training.fundamentals, training.mainPart, training.finalPart, training.notes].some((v) => v?.trim())) {
      doc.font("Helvetica").fontSize(9).fillColor(grayLight).text("Nenhum bloco preenchido ainda.", ML, y, { lineBreak: false });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = H - 28;
    doc.rect(0, footerY, W, 28).fill(surface);
    doc.font("Helvetica").fontSize(7.5).fillColor(gray)
      .text(`Gerado em ${new Date().toLocaleString("pt-BR")} · ${orgName}`, ML, footerY + 9, { width: contentW, align: "center", lineBreak: false });

    doc.end();
  });
}

export const trainingsService = {
  async findAll(filters: TrainingFilters) {
    await ensureUpcomingTrainings().catch(() => {
      // Não deixa a listagem quebrar se a auto-criação falhar por algum motivo.
    });

    return prisma.training.findMany({
      where: buildWhere(filters),
      orderBy: { date: "asc" },
    });
  },

  async findById(id: string) {
    const training = await prisma.training.findUnique({
      where: { id },
    });

    if (!training) {
      throw new AppError("Treino não encontrado", 404);
    }

    return training;
  },

  async create(payload: TrainingPayload) {
    const blockedDates = await loadBlockedDates();
    const data = buildData(payload, true, blockedDates) as Prisma.TrainingUncheckedCreateInput;

    const training = await prisma.training.create({ data });
    googleCalendarService.syncTrainingCreate(training).catch(() => {});
    return training;
  },

  async update(id: string, payload: TrainingPayload) {
    const existing = await this.findById(id);
    const blockedDates = await loadBlockedDates();
    const data = buildData(payload, false, blockedDates) as Prisma.TrainingUncheckedUpdateInput;

    const updated = await prisma.training.update({ where: { id }, data });
    googleCalendarService.syncTrainingUpdate({ ...updated, googleEventId: existing.googleEventId }).catch(() => {});
    return updated;
  },

  async delete(id: string) {
    const existing = await this.findById(id);
    await prisma.training.delete({ where: { id } });
    googleCalendarService.syncTrainingDelete(existing.googleEventId).catch(() => {});
  },

  async generatePdf(id: string) {
    const training = await this.findById(id);
    const buffer = await generateTrainingPdfBuffer(training);
    const datePart = toTrainingDateKey(training.date);
    const safeTitle = training.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60);
    return { buffer, fileName: `Treino ${datePart} - ${safeTitle}.pdf` };
  },
};

