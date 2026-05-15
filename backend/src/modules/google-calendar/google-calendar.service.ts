import { google } from "googleapis";
import { prisma } from "../../config/prisma";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/google-calendar/callback";
const TEAM_REDIRECT_URI = process.env.GOOGLE_TEAM_REDIRECT_URI || "http://localhost:3000/google-calendar/team/callback";
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

function makeOAuth2(redirectUri: string) {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri);
}

async function getCalendarClientForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.googleRefreshToken) return null;

  const auth = makeOAuth2(REDIRECT_URI);
  auth.setCredentials({ refresh_token: user.googleRefreshToken });
  return { auth, calendarId: user.googleCalendarId || "primary" };
}

async function getTeamCalendarClient() {
  const setting = await prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
  if (!setting?.googleRefreshToken) return null;

  const auth = makeOAuth2(TEAM_REDIRECT_URI);
  auth.setCredentials({ refresh_token: setting.googleRefreshToken });
  return { auth, calendarId: setting.googleCalendarId || "primary" };
}

function trainingToEvent(training: {
  date: Date;
  title: string;
  category?: string | null;
  objective?: string | null;
  trainingTime?: string;
}) {
  const dateStr = training.date.toISOString().slice(0, 10);
  const [startHour = "17", startMin = "30"] = (training.trainingTime || "17:30").split(":");
  const startDateTime = `${dateStr}T${startHour.padStart(2, "0")}:${startMin.padStart(2, "0")}:00`;

  const startDate = new Date(`${dateStr}T${startHour.padStart(2, "0")}:${startMin.padStart(2, "0")}:00`);
  const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);
  const endDateTime = endDate.toISOString().slice(0, 19);

  const description = [training.objective, training.category ? `Categoria: ${training.category}` : ""]
    .filter(Boolean)
    .join("\n");

  return {
    summary: `🏐 ${training.title}`,
    description: description || undefined,
    start: { dateTime: `${startDateTime}-03:00`, timeZone: "America/Sao_Paulo" },
    end: { dateTime: `${endDateTime}-03:00`, timeZone: "America/Sao_Paulo" },
  };
}

export const googleCalendarService = {
  isConfigured,

  getAuthUrl(userId: string) {
    if (!isConfigured()) throw new Error("Google Calendar não está configurado no servidor.");
    const auth = makeOAuth2(REDIRECT_URI);
    return auth.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state: userId,
    });
  },

  getTeamAuthUrl() {
    if (!isConfigured()) throw new Error("Google Calendar não está configurado no servidor.");
    const auth = makeOAuth2(TEAM_REDIRECT_URI);
    return auth.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });
  },

  async handleCallback(code: string, userId: string) {
    const auth = makeOAuth2(REDIRECT_URI);
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) throw new Error("Refresh token não recebido. Tente revogar e reconectar.");

    auth.setCredentials(tokens);
    const cal = google.calendar({ version: "v3", auth });
    const calList = await cal.calendarList.list({ minAccessRole: "writer" });
    const primaryCal = calList.data.items?.find((c) => c.primary) || calList.data.items?.[0];
    const calendarId = primaryCal?.id || "primary";

    await prisma.user.update({
      where: { id: userId },
      data: { googleRefreshToken: tokens.refresh_token, googleCalendarId: calendarId },
    });

    return { calendarId };
  },

  async handleTeamCallback(code: string) {
    const auth = makeOAuth2(TEAM_REDIRECT_URI);
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) throw new Error("Refresh token não recebido. Tente revogar e reconectar.");

    auth.setCredentials(tokens);
    const cal = google.calendar({ version: "v3", auth });
    const calList = await cal.calendarList.list({ minAccessRole: "writer" });
    const primaryCal = calList.data.items?.find((c) => c.primary) || calList.data.items?.[0];
    const calendarId = primaryCal?.id || "primary";

    await prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      update: { googleRefreshToken: tokens.refresh_token, googleCalendarId: calendarId },
      create: { id: "singleton", blockedDates: [], googleRefreshToken: tokens.refresh_token, googleCalendarId: calendarId },
    });

    return { calendarId };
  },

  async disconnectUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { googleRefreshToken: null, googleCalendarId: null },
    });
  },

  async disconnectTeam() {
    await prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      update: { googleRefreshToken: null, googleCalendarId: null },
      create: { id: "singleton", blockedDates: [] },
    });
  },

  async getUserStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true, googleCalendarId: true },
    });
    return {
      connected: Boolean(user?.googleRefreshToken),
      calendarId: user?.googleCalendarId || null,
      configured: isConfigured(),
    };
  },

  async getTeamStatus() {
    const setting = await prisma.trainingSetting.findUnique({
      where: { id: "singleton" },
      select: { googleRefreshToken: true, googleCalendarId: true },
    });
    return {
      connected: Boolean(setting?.googleRefreshToken),
      calendarId: setting?.googleCalendarId || null,
      configured: isConfigured(),
    };
  },

  async syncTrainingCreate(training: { id: string; date: Date; title: string; category?: string | null; objective?: string | null }) {
    if (!isConfigured()) return;
    const client = await getTeamCalendarClient();
    if (!client) return;

    try {
      const setting = await prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
      const event = trainingToEvent({ ...training, trainingTime: setting?.trainingTime });
      const cal = google.calendar({ version: "v3", auth: client.auth });
      const res = await cal.events.insert({ calendarId: client.calendarId, requestBody: event });
      if (res.data.id) {
        await prisma.training.update({ where: { id: training.id }, data: { googleEventId: res.data.id } });
      }
    } catch {
      // Falha silenciosa — calendar é integração opcional
    }
  },

  async syncTrainingUpdate(training: { id: string; date: Date; title: string; category?: string | null; objective?: string | null; googleEventId?: string | null }) {
    if (!isConfigured() || !training.googleEventId) return;
    const client = await getTeamCalendarClient();
    if (!client) return;

    try {
      const setting = await prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
      const event = trainingToEvent({ ...training, trainingTime: setting?.trainingTime });
      const cal = google.calendar({ version: "v3", auth: client.auth });
      await cal.events.update({ calendarId: client.calendarId, eventId: training.googleEventId, requestBody: event });
    } catch {
      // Falha silenciosa
    }
  },

  async syncTrainingDelete(googleEventId: string | null | undefined) {
    if (!isConfigured() || !googleEventId) return;
    const client = await getTeamCalendarClient();
    if (!client) return;

    try {
      const cal = google.calendar({ version: "v3", auth: client.auth });
      await cal.events.delete({ calendarId: client.calendarId, eventId: googleEventId });
    } catch {
      // Falha silenciosa
    }
  },

  async syncBlockedDateCreate(date: string) {
    if (!isConfigured()) return null;
    const client = await getTeamCalendarClient();
    if (!client) return null;

    try {
      const cal = google.calendar({ version: "v3", auth: client.auth });
      const res = await cal.events.insert({
        calendarId: client.calendarId,
        requestBody: {
          summary: "🚫 Treino Cancelado — Pegasus",
          start: { date },
          end: { date },
        },
      });
      return res.data.id || null;
    } catch {
      return null;
    }
  },

  async syncBlockedDateDelete(eventId: string) {
    if (!isConfigured()) return;
    const client = await getTeamCalendarClient();
    if (!client) return;

    try {
      const cal = google.calendar({ version: "v3", auth: client.auth });
      await cal.events.delete({ calendarId: client.calendarId, eventId });
    } catch {
      // Falha silenciosa
    }
  },
};
