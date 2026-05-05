import { api } from "./api";

export const calendarService = {
  async getBlockedDates(): Promise<string[]> {
    const { data } = await api.get<{ blockedDates: string[] }>("/calendar/blocked-dates");
    return data.blockedDates;
  },

  async setBlockedDates(dates: string[]): Promise<string[]> {
    const { data } = await api.put<{ blockedDates: string[] }>("/calendar/blocked-dates", { blockedDates: dates });
    return data.blockedDates;
  },

  async toggleBlockedDate(date: string): Promise<string[]> {
    const { data } = await api.post<{ blockedDates: string[] }>("/calendar/blocked-dates/toggle", { date });
    return data.blockedDates;
  },
};
