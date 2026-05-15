import crypto from "crypto";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { prisma } from "../../config/prisma";
import { notificationsService } from "../notifications/notifications.service";

async function getSettings() {
  return prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
}

async function getMPClient() {
  const settings = await getSettings();
  if (!settings?.pixApiKey || settings.pixProvider !== "mercadopago") {
    throw new Error("Mercado Pago não está configurado. Configure o provedor e a API Key nas Configurações.");
  }
  return new MercadoPagoConfig({ accessToken: settings.pixApiKey });
}

export const pixService = {
  async generatePixPayment(paymentId: string, payerEmail: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { athlete: true },
    });
    if (!payment) throw new Error("Pagamento não encontrado.");
    if (payment.status === "pago") throw new Error("Este pagamento já foi quitado.");

    const client = await getMPClient();
    const paymentClient = new Payment(client);

    const amount = Number(payment.amount);
    const description = payment.description || `Mensalidade Pegasus`;

    const response = await paymentClient.create({
      body: {
        transaction_amount: amount,
        description,
        payment_method_id: "pix",
        payer: { email: payerEmail || "atleta@pegasus.com" },
        external_reference: paymentId,
      },
    });

    const txData = response.point_of_interaction?.transaction_data;

    return {
      paymentId: response.id,
      qrCodeBase64: txData?.qr_code_base64 ?? null,
      qrCode: txData?.qr_code ?? null,
      expiresAt: response.date_of_expiration ?? null,
      status: response.status,
    };
  },

  async handleWebhook(body: Record<string, unknown>, signature: string | undefined, rawBody: string) {
    const settings = await getSettings();
    const secret = settings?.pixWebhookSecret;

    if (secret && signature) {
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        throw new Error("Assinatura do webhook inválida.");
      }
    }

    const action = body.action as string | undefined;
    if (action !== "payment.updated" && action !== "payment.created") return { ok: true };

    const data = body.data as { id?: string | number } | undefined;
    if (!data?.id) return { ok: true };

    const mpPaymentId = String(data.id);
    const client = await getMPClient();
    const paymentClient = new Payment(client);
    const mpPayment = await paymentClient.get({ id: mpPaymentId });

    if (mpPayment.status !== "approved") return { ok: true };

    const externalRef = mpPayment.external_reference;
    if (!externalRef) return { ok: true };

    const localPayment = await prisma.payment.findUnique({
      where: { id: externalRef },
      include: { athlete: true },
    });

    if (!localPayment || localPayment.status === "pago") return { ok: true };

    await prisma.payment.update({
      where: { id: externalRef },
      data: { status: "pago", paidAt: new Date() },
    });

    if (localPayment.athleteId) {
      await prisma.athlete.update({
        where: { id: localPayment.athleteId },
        data: { monthlyPaymentStatus: "pago" },
      });

      const athleteUser = await prisma.user.findFirst({
        where: { athleteId: localPayment.athleteId },
      });

      if (athleteUser) {
        await notificationsService.create({
          userId: athleteUser.id,
          title: "Pagamento confirmado!",
          message: `Seu pagamento de "${localPayment.description}" foi confirmado via PIX.`,
          type: "payment",
        });
      }

      const gestaoUsers = await prisma.user.findMany({
        where: {
          active: true,
          roles: {
            some: {
              role: {
                name: { in: ["Diretor", "Financeiro", "RH", "Gestao"] },
              },
            },
          },
        },
        select: { id: true },
      });

      await Promise.all(
        gestaoUsers.map((u) =>
          notificationsService.create({
            userId: u.id,
            title: "PIX recebido",
            message: `${localPayment.athlete?.name ?? "Atleta"} pagou "${localPayment.description}" via PIX.`,
            type: "payment",
          }),
        ),
      );
    }

    return { ok: true };
  },
};
