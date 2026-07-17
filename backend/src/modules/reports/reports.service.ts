import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma";
import { emailService } from "../email/email.service";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function monthLabel(month: string) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

async function generatePdfBuffer(month: string): Promise<Buffer> {
  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));

  const [payments, movements, trainings, games, athletes] = await Promise.all([
    prisma.payment.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { athlete: { select: { name: true } } },
    }),
    prisma.cashMovement.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
    prisma.training.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
    prisma.game.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
    prisma.athlete.findMany({
      where: { activatedAt: { gte: start, lt: end } },
      select: { name: true, activatedAt: true, category: true },
      orderBy: { activatedAt: "asc" },
    }),
  ]);

  const totalReceita = payments.filter((p) => p.type === "receita" && p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalDespesaPayments = payments.filter((p) => p.type === "despesa").reduce((s, p) => s + Number(p.amount), 0);
  const saidasMovimento = movements.filter((mv) => mv.type === "saida");
  const entradasMovimento = movements.filter((mv) => mv.type === "entrada");
  const totalSaidasMovimento = saidasMovimento.reduce((s, mv) => s + Number(mv.amount), 0);
  const totalEntradasMovimento = entradasMovimento.reduce((s, mv) => s + Number(mv.amount), 0);
  const totalDespesaGeral = totalDespesaPayments + totalSaidasMovimento;

  const mensalidades = payments.filter((p) => p.category === "mensalidade" || p.description?.toLowerCase().includes("mensalidade"));
  const mensalidadesPago = mensalidades.filter((p) => p.status === "pago").length;
  const label = monthLabel(month);

  const W = 595.28;
  const H = 841.89;
  const ML = 40;
  const MR = 40;
  const contentW = W - ML - MR;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: "A4", autoFirstPage: true, bufferPages: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const navy = "#1e3a5f";
    const gray = "#64748b";
    const light = "#eef2f8";
    const accent = "#3b82f6";

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 62).fill(navy);
    doc.fillColor("white").fontSize(20).font("Helvetica-Bold").text("Pegasus Manager", ML, 14, { lineBreak: false });
    doc.fontSize(10).font("Helvetica").fillColor("#93c5fd").text(`Relatório Mensal — ${label}`, ML, 40, { lineBreak: false });

    let y = 82;

    // ── helpers ─────────────────────────────────────────────────────────────
    function sectionTitle(title: string) {
      doc.rect(ML, y, contentW, 20).fill(light);
      doc.fillColor(navy).font("Helvetica-Bold").fontSize(9.5)
        .text(title, ML + 6, y + 5, { lineBreak: false });
      y += 26;
    }

    function row(lbl: string, value: string, indent = 0, bold = false) {
      const lx = ML + indent;
      const lw = contentW * 0.65;
      const rx = ML;
      const rw = contentW;
      doc.font("Helvetica").fontSize(9).fillColor(gray)
        .text(lbl, lx, y, { width: lw - indent, lineBreak: false });
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(navy)
        .text(value, rx, y, { width: rw, align: "right", lineBreak: false });
      y += 16;
    }

    function rowDivider() {
      y += 2;
      doc.moveTo(ML, y).lineTo(ML + contentW, y).strokeColor("#dde3f0").lineWidth(0.5).stroke();
      y += 5;
    }

    function gap(n = 10) { y += n; }

    // ── Resumo Financeiro ────────────────────────────────────────────────────
    sectionTitle("Resumo Financeiro");
    row("Receitas pagas (mensalidades e outros)", formatCurrency(totalReceita));
    if (totalEntradasMovimento > 0) {
      row("Entradas de caixa", formatCurrency(totalEntradasMovimento));
    }
    rowDivider();
    if (totalDespesaPayments > 0) {
      row("Despesas (pagamentos lançados)", formatCurrency(totalDespesaPayments));
    }
    if (saidasMovimento.length > 0) {
      for (const mv of saidasMovimento) {
        row(mv.description, `− ${formatCurrency(Number(mv.amount))}`, 8);
      }
    }
    if (totalDespesaGeral === 0) {
      row("Despesas do mês", formatCurrency(0));
    } else {
      rowDivider();
      row("Total de saídas", formatCurrency(totalDespesaGeral), 0, true);
    }
    rowDivider();
    row("Saldo do mês", formatCurrency(totalReceita + totalEntradasMovimento - totalDespesaGeral), 0, true);
    gap(10);

    // ── Mensalidades ──────────────────────────────────────────────────────────
    if (mensalidades.length > 0) {
      sectionTitle("Mensalidades");
      row("Total de atletas cobrados", String(mensalidades.length));
      row("Pagamentos confirmados", String(mensalidadesPago));
      row("Taxa de adimplência", `${Math.round((mensalidadesPago / mensalidades.length) * 100)}%`);
      gap(10);
    }

    // ── Treinos ───────────────────────────────────────────────────────────────
    sectionTitle(`Treinos (${trainings.length})`);
    if (trainings.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor(gray)
        .text("Nenhum treino realizado no mês.", ML, y, { lineBreak: false });
      y += 16;
    } else {
      for (const t of trainings) {
        row(formatDate(t.date), t.title, 8);
      }
    }
    gap(10);

    // ── Jogos ─────────────────────────────────────────────────────────────────
    sectionTitle(`Jogos (${games.length})`);
    if (games.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor(gray)
        .text("Nenhum jogo registrado no mês.", ML, y, { lineBreak: false });
      y += 16;
    } else {
      for (const g of games) {
        row(`${formatDate(g.date)} · vs ${g.opponent}`, `${g.scorePegasus} × ${g.scoreOpponent}`, 8);
      }
    }
    gap(10);

    // ── Atletas aprovados ────────────────────────────────────────────────────
    sectionTitle(`Atletas aprovados no mês (${athletes.length})`);
    if (athletes.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor(gray)
        .text("Nenhum atleta aprovado este mês.", ML, y, { lineBreak: false });
      y += 16;
    } else {
      for (const a of athletes) {
        row(a.name, a.category ?? "—", 8);
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = H - 28;
    doc.rect(0, footerY, W, 28).fill(light);
    doc.font("Helvetica").fontSize(7.5).fillColor(gray)
      .text(
        `Gerado em ${new Date().toLocaleString("pt-BR")} · Pegasus Manager`,
        ML,
        footerY + 9,
        { width: contentW, align: "center", lineBreak: false },
      );

    doc.end();
  });
}

export const reportsService = {
  async list() {
    return prisma.monthlyReport.findMany({ orderBy: { generatedAt: "desc" } });
  },

  async generate(month?: string) {
    const target = month ?? new Date().toISOString().slice(0, 7);
    const label = monthLabel(target);
    const fileName = `relatorio-${target}.pdf`;

    const pdfBuffer = await generatePdfBuffer(target);

    const ab = new ArrayBuffer(pdfBuffer.length);
    new Uint8Array(ab).set(pdfBuffer);
    const content = new Uint8Array(ab) as Uint8Array<ArrayBuffer>;
    const report = await prisma.monthlyReport.upsert({
      where: { month: target },
      update: { content, fileSize: pdfBuffer.length, generatedAt: new Date(), sentAt: null, fileName },
      create: { month: target, fileName, content, fileSize: pdfBuffer.length },
    });

    // Try to send by email to gestão
    const canSend = await emailService.isEnabled();
    if (canSend) {
      const gestaoUsers = await prisma.user.findMany({
        where: {
          active: true,
          roles: { some: { role: { name: { in: ["Diretor", "Financeiro", "Gestao"] } } } },
          email: { not: null },
        },
        select: { email: true },
      });

      const settings = await prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
      const emailCfg = settings;

      for (const u of gestaoUsers) {
        if (!u.email) continue;
        try {
          await emailService.sendEmail(
            u.email,
            `Relatório Mensal — ${label}`,
            `<p>Olá,</p><p>Segue em anexo o relatório mensal do Pegasus Manager referente a <strong>${label}</strong>.</p>`,
          );
        } catch { /* Silently fail */ }
      }

      if (gestaoUsers.length > 0) {
        await prisma.monthlyReport.update({ where: { id: report.id }, data: { sentAt: new Date() } });
      }
    }

    return report;
  },

  async download(id: string) {
    const report = await prisma.monthlyReport.findUnique({ where: { id } });
    if (!report) throw new Error("Relatório não encontrado.");
    await prisma.monthlyReport.delete({ where: { id } });
    return { content: report.content, fileName: report.fileName };
  },
};
