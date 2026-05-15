import { api } from "./api";

export type GoogleCalendarStatus = {
  connected: boolean;
  calendarId: string | null;
  configured: boolean;
};

export const googleCalendarService = {
  async getUserStatus(): Promise<GoogleCalendarStatus> {
    const { data } = await api.get<GoogleCalendarStatus>("/google-calendar/status");
    return data;
  },

  async getAuthUrl(): Promise<string> {
    const { data } = await api.get<{ url: string }>("/google-calendar/auth-url");
    return data.url;
  },

  async disconnect(): Promise<void> {
    await api.delete("/google-calendar/disconnect");
  },

  async getTeamStatus(): Promise<GoogleCalendarStatus> {
    const { data } = await api.get<GoogleCalendarStatus>("/google-calendar/team/status");
    return data;
  },

  async getTeamAuthUrl(): Promise<string> {
    const { data } = await api.get<{ url: string }>("/google-calendar/team/auth-url");
    return data.url;
  },

  async disconnectTeam(): Promise<void> {
    await api.delete("/google-calendar/team/disconnect");
  },
};
