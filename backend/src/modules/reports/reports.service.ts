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
    prisma.cashMovement.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.training.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
    prisma.game.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
    prisma.athlete.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { name: true, createdAt: true, category: true },
    }),
  ]);

  const totalReceita = payments.filter((p) => p.type === "receita" && p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalDespesa = payments.filter((p) => p.type === "despesa").reduce((s, p) => s + Number(p.amount), 0);
  const totalMovimento = movements.filter((m) => m.type === "entrada").reduce((s, m) => s + Number(m.amount), 0)
    - movements.filter((m) => m.type === "saida").reduce((s, m) => s + Number(m.amount), 0);

  const mensalidades = payments.filter((p) => p.category === "mensalidade" || p.description?.toLowerCase().includes("mensalidade"));
  const mensalidadesPago = mensalidades.filter((p) => p.status === "pago").length;
  const label = monthLabel(month);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const navy = "#1e3a5f";
    const gray = "#64748b";
    const light = "#f1f5f9";

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill(navy);
    doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("Pegasus Manager", 48, 24);
    doc.fontSize(11).font("Helvetica").text(`Relatório Mensal — ${label}`, 48, 52);
    doc.fillColor(navy).fontSize(10);

    let y = 108;

    function sectionTitle(title: string) {
      doc.rect(48, y, doc.page.width - 96, 24).fill(light);
      doc.fillColor(navy).font("Helvetica-Bold").fontSize(11).text(title, 56, y + 6);
      doc.fillColor(navy).font("Helvetica").fontSize(10);
      y += 34;
    }

    function row(label: string, value: string, indent = 0) {
      doc.fillColor(gray).text(label, 48 + indent, y);
      doc.fillColor(navy).font("Helvetica-Bold").text(value, 0, y, { align: "right" });
      doc.font("Helvetica");
      y += 18;
    }

    function checkPage() {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 48;
      }
    }

    // FINANCEIRO
    sectionTitle("Resumo Financeiro");
    row("Total receitas pagas", formatCurrency(totalReceita));
    row("Total despesas", formatCurrency(totalDespesa));
    row("Saldo caixa (movimentações)", formatCurrency(totalMovimento));
    row("Saldo líquido", formatCurrency(totalReceita - totalDespesa));
    y += 8;

    if (mensalidades.length > 0) {
      sectionTitle("Mensalidades");
      row("Total de atletas cobrados", String(mensalidades.length));
      row("Pagamentos confirmados", String(mensalidadesPago));
      row("Taxa de adimplência", `${mensalidades.length > 0 ? Math.round((mensalidadesPago / mensalidades.length) * 100) : 0}%`);
      y += 8;
    }

    checkPage();

    // TREINOS
    sectionTitle(`Treinos (${trainings.length})`);
    if (trainings.length === 0) {
      doc.fillColor(gray).text("Nenhum treino realizado no mês.", 48, y);
      y += 18;
    } else {
      for (const t of trainings.slice(0, 20)) {
        checkPage();
        row(formatDate(t.date), t.title, 8);
      }
      if (trainings.length > 20) {
        doc.fillColor(gray).text(`... e mais ${trainings.length - 20} treinos.`, 48, y);
        y += 18;
      }
    }
    y += 8;

    checkPage();

    // JOGOS
    sectionTitle(`Jogos (${games.length})`);
    if (games.length === 0) {
      doc.fillColor(gray).text("Nenhum jogo registrado no mês.", 48, y);
      y += 18;
    } else {
      for (const g of games) {
        checkPage();
        const result = `${g.scorePegasus} × ${g.scoreOpponent} vs ${g.opponent}`;
        row(formatDate(g.date), result, 8);
      }
    }
    y += 8;

    checkPage();

    // NOVOS ATLETAS
    sectionTitle(`Novos Atletas (${athletes.length})`);
    if (athletes.length === 0) {
      doc.fillColor(gray).text("Nenhum novo atleta cadastrado no mês.", 48, y);
      y += 18;
    } else {
      for (const a of athletes) {
        checkPage();
        row(a.name, a.category ?? "Sem categoria", 8);
      }
    }

    // Footer
    doc.rect(0, doc.page.height - 36, doc.page.width, 36).fill(light);
    doc.fillColor(gray).fontSize(8).text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} · Pegasus Manager`,
      48,
      doc.page.height - 22,
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

    const report = await prisma.monthlyReport.upsert({
      where: { month: target },
      update: { content: pdfBuffer, fileSize: pdfBuffer.length, generatedAt: new Date(), sentAt: null, fileName },
      create: { month: target, fileName, content: pdfBuffer, fileSize: pdfBuffer.length },
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
    return { content: report.content, fileName: report.fileName };
  },
};
