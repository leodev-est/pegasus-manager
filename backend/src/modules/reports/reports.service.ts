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

  const [payments, movements, trainings, games, athletes, paymentsBefore, movesBefore, mensalidadePayments] = await Promise.all([
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
    // Tudo pago/lançado ANTES do mês do relatório, pra saber o saldo com que o mês começou.
    prisma.payment.findMany({ where: { status: "pago", createdAt: { lt: start } }, select: { amount: true, type: true } }),
    prisma.cashMovement.findMany({ where: { date: { lt: start } }, select: { amount: true, type: true } }),
    // Mensalidades do mês de referência (não de quando a cobrança foi criada), contando só
    // atletas ainda ativos e não isentos — mesmo critério usado no resumo do Financeiro.
    prisma.payment.findMany({
      where: {
        referenceMonth: month,
        status: { not: "isento" },
        OR: [
          { category: { equals: "mensalidade", mode: "insensitive" } },
          { description: { contains: "mensalidade", mode: "insensitive" } },
        ],
        athlete: { is: { status: "ativo", monthlyPaymentStatus: { not: "isento" } } },
      },
      select: { status: true },
    }),
  ]);

  const setting = await prisma.trainingSetting.findUnique({
    where: { id: "singleton" },
    select: { systemName: true },
  });
  const orgName = setting?.systemName ?? "Pegasus Manager";

  const saldoInicialDoMes =
    paymentsBefore.filter((p) => p.type === "receita").reduce((s, p) => s + Number(p.amount), 0) -
    paymentsBefore.filter((p) => p.type === "despesa").reduce((s, p) => s + Number(p.amount), 0) +
    movesBefore.filter((mv) => mv.type === "entrada").reduce((s, mv) => s + Number(mv.amount), 0) -
    movesBefore.filter((mv) => mv.type === "saida").reduce((s, mv) => s + Number(mv.amount), 0);

  const totalReceita = payments.filter((p) => p.type === "receita" && p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalDespesaPayments = payments.filter((p) => p.type === "despesa").reduce((s, p) => s + Number(p.amount), 0);
  const saidasMovimento = movements.filter((mv) => mv.type === "saida");
  const entradasMovimento = movements.filter((mv) => mv.type === "entrada");
  const totalSaidasMovimento = saidasMovimento.reduce((s, mv) => s + Number(mv.amount), 0);
  const totalEntradasMovimento = entradasMovimento.reduce((s, mv) => s + Number(mv.amount), 0);
  const totalDespesaGeral = totalDespesaPayments + totalSaidasMovimento;

  const mensalidadesPago = mensalidadePayments.filter((p) => p.status === "pago").length;
  const label = monthLabel(month);
  const saldoDoMes = totalReceita + totalEntradasMovimento - totalDespesaGeral;
  const saldoFinalDoMes = saldoInicialDoMes + saldoDoMes;
  const adimplenciaPct = mensalidadePayments.length > 0
    ? Math.round((mensalidadesPago / mensalidadePayments.length) * 100)
    : null;

  const W = 595.28;
  const H = 841.89;
  const ML = 40;
  const MR = 40;
  const contentW = W - ML - MR;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margins: { top: ML, bottom: 0, left: ML, right: MR },
      size: "A4",
      autoFirstPage: true,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Paleta alinhada ao tema preto + verde do app (Tailwind zinc/emerald).
    const ink = "#18181b";
    const gray = "#71717a";
    const grayLight = "#a1a1aa";
    const surface = "#f4f4f5";
    const border = "#e4e4e7";
    const emerald = "#16a34a";
    const rose = "#dc2626";

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 68).fill(ink);
    doc.rect(0, 68, W, 3).fill(emerald);
    doc.fillColor("white").fontSize(21).font("Helvetica-Bold").text(orgName, ML, 16, { lineBreak: false });
    doc.fontSize(10.5).font("Helvetica").fillColor("#86efac")
      .text(`Relatório Mensal · ${label}`, ML, 42, { lineBreak: false, characterSpacing: 0.2 });

    let y = 92;

    // ── helpers ─────────────────────────────────────────────────────────────
    function sectionTitle(title: string) {
      doc.rect(ML, y, 3, 12).fill(emerald);
      doc.fillColor(ink).font("Helvetica-Bold").fontSize(9.5)
        .text(title.toUpperCase(), ML + 9, y, { lineBreak: false, characterSpacing: 0.6 });
      y += 12;
      doc.moveTo(ML, y + 6).lineTo(ML + contentW, y + 6).strokeColor(border).lineWidth(0.75).stroke();
      y += 16;
    }

    function row(lbl: string, value: string, indent = 0, bold = false, valueColor = ink) {
      const lx = ML + indent;
      const lw = contentW * 0.65;
      const rx = ML;
      const rw = contentW;
      doc.font("Helvetica").fontSize(9).fillColor(gray)
        .text(lbl, lx, y, { width: lw - indent, lineBreak: false });
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(valueColor)
        .text(value, rx, y, { width: rw, align: "right", lineBreak: false });
      y += 17;
    }

    function zebraRow(lbl: string, value: string, index: number) {
      if (index % 2 === 0) {
        doc.rect(ML, y - 3, contentW, 17).fill(surface);
      }
      row(lbl, value, 8);
    }

    function rowDivider() {
      y += 2;
      doc.moveTo(ML, y).lineTo(ML + contentW, y).strokeColor(border).lineWidth(0.5).stroke();
      y += 6;
    }

    function emptyNote(text: string) {
      doc.font("Helvetica").fontSize(9).fillColor(grayLight).text(text, ML, y, { lineBreak: false });
      y += 16;
    }

    function gap(n = 10) { y += n; }

    // ── KPIs em destaque ────────────────────────────────────────────────────
    const kpis: Array<{ label: string; value: string; color: string }> = [
      { label: "Saldo do mês", value: formatCurrency(saldoDoMes), color: saldoDoMes >= 0 ? emerald : rose },
      { label: "Caixa final do mês", value: formatCurrency(saldoFinalDoMes), color: saldoFinalDoMes >= 0 ? ink : rose },
    ];
    if (adimplenciaPct !== null) {
      kpis.push({ label: "Adimplência", value: `${adimplenciaPct}%`, color: adimplenciaPct >= 70 ? emerald : rose });
    }
    const kpiGap = 10;
    const kpiW = (contentW - kpiGap * (kpis.length - 1)) / kpis.length;
    const kpiH = 46;
    kpis.forEach((kpi, i) => {
      const x = ML + i * (kpiW + kpiGap);
      doc.roundedRect(x, y, kpiW, kpiH, 6).fillAndStroke(surface, border);
      doc.font("Helvetica").fontSize(7.5).fillColor(gray)
        .text(kpi.label.toUpperCase(), x + 10, y + 9, { width: kpiW - 20, lineBreak: false, characterSpacing: 0.4 });
      doc.font("Helvetica-Bold").fontSize(15).fillColor(kpi.color)
        .text(kpi.value, x + 10, y + 22, { width: kpiW - 20, lineBreak: false });
    });
    y += kpiH + 18;

    // ── Resumo Financeiro ────────────────────────────────────────────────────
    sectionTitle("Resumo Financeiro");
    row("Saldo inicial do caixa (início do mês)", formatCurrency(saldoInicialDoMes), 0, true);
    rowDivider();
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
        row(mv.description, `- ${formatCurrency(Number(mv.amount))}`, 8);
      }
    }
    if (totalDespesaGeral === 0) {
      row("Despesas do mês", formatCurrency(0));
    } else {
      rowDivider();
      row("Total de saídas", formatCurrency(totalDespesaGeral), 0, true);
    }
    rowDivider();
    row("Saldo final do caixa (fim do mês)", formatCurrency(saldoFinalDoMes), 0, true, saldoFinalDoMes >= 0 ? emerald : rose);
    gap(10);

    // ── Mensalidades ──────────────────────────────────────────────────────────
    if (mensalidadePayments.length > 0) {
      sectionTitle("Mensalidades");
      row("Total de atletas cobrados", String(mensalidadePayments.length));
      row("Pagamentos confirmados", String(mensalidadesPago), 0, false, emerald);
      gap(10);
    }

    // ── Treinos ───────────────────────────────────────────────────────────────
    sectionTitle(`Treinos (${trainings.length})`);
    if (trainings.length === 0) {
      emptyNote("Nenhum treino realizado no mês.");
    } else {
      trainings.forEach((t, i) => zebraRow(formatDate(t.date), t.title, i));
    }
    gap(10);

    // ── Jogos ─────────────────────────────────────────────────────────────────
    sectionTitle(`Jogos (${games.length})`);
    if (games.length === 0) {
      emptyNote("Nenhum jogo registrado no mês.");
    } else {
      games.forEach((g, i) => zebraRow(`${formatDate(g.date)} · vs ${g.opponent}`, `${g.scorePegasus} × ${g.scoreOpponent}`, i));
    }
    gap(10);

    // ── Atletas aprovados ────────────────────────────────────────────────────
    sectionTitle(`Atletas aprovados no mês (${athletes.length})`);
    if (athletes.length === 0) {
      emptyNote("Nenhum atleta aprovado este mês.");
    } else {
      athletes.forEach((a, i) => zebraRow(a.name, a.category ?? "—", i));
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = H - 28;
    doc.rect(0, footerY, W, 28).fill(surface);
    doc.font("Helvetica").fontSize(7.5).fillColor(gray)
      .text(
        `Gerado em ${new Date().toLocaleString("pt-BR")} · ${orgName}`,
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
      const orgName = settings?.systemName ?? "Pegasus Manager";

      for (const u of gestaoUsers) {
        if (!u.email) continue;
        try {
          await emailService.sendEmail(
            u.email,
            `Relatório Mensal — ${label}`,
            `<p>Olá,</p><p>Segue em anexo o relatório mensal do ${orgName} referente a <strong>${label}</strong>.</p>`,
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
