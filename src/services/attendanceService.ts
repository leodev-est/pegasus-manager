import { api } from "./api";

export type AttendanceStatus = "presente" | "falta" | "justificada" | "programado";

export type AttendanceTraining = {
  id: string;
  title: string;
  date: string;
  horario: string;
  local: string;
  modalidade: string;
};

export type TodayCheckIn = {
  available: boolean;
  checkedIn: boolean;
  message: string;
  training: AttendanceTraining | null;
  attendance?: {
    id: string;
    status: AttendanceStatus;
    checkedInAt: string;
  } | null;
};

export type FrequencyDetail = {
  attendanceId: string | null;
  checkedInAt: string | null;
  date: string;
  horario: string;
  local: string;
  modalidade: string;
  status: AttendanceStatus;
};

export type MyFrequency = {
  athlete: {
    id: string;
    name: string;
  };
  month: number;
  year: number;
  totalTreinos: number;
  presencas: number;
  faltas: number;
  justificadas: number;
  percentual: number;
  details: FrequencyDetail[];
};

export type AthleteFrequency = Omit<MyFrequency, "athlete"> & {
  athlete: {
    id: string;
    name: string;
    category: string | null;
    position: string | null;
  };
};

export type ChamadaAttendanceStatus = Exclude<AttendanceStatus, "programado">;

export type ChamadaAthlete = {
  id: string;
  name: string;
  category: string | null;
  attendanceId: string | null;
  status: ChamadaAttendanceStatus | null;
};

export type Chamada = {
  available: boolean;
  date: string;
  training: AttendanceTraining | null;
  athletes: ChamadaAthlete[];
};

export const attendanceService = {
  async getTodayCheckIn() {
    const { data } = await api.get<TodayCheckIn>("/attendance/check-in/today");
    return data;
  },

  async checkIn(trainingId: string) {
    const { data } = await api.post("/attendance/check-in", { trainingId });
    return data;
  },

  async getMyFrequency(month: number, year: number) {
    const { data } = await api.get<MyFrequency>("/attendance/my-frequency", {
      params: { month, year },
    });
    return data;
  },

  async getFrequency(month: number, year: number, athleteId?: string) {
    const { data } = await api.get<AthleteFrequency[]>("/attendance/frequency", {
      params: { athleteId, month, year },
    });
    return data;
  },

  async updateAttendance(id: string, payload: { notes?: string | null; status: Exclude<AttendanceStatus, "programado"> }) {
    const { data } = await api.patch(`/attendance/${id}`, payload);
    return data;
  },

  async getChamada(date: string) {
    const { data } = await api.get<Chamada>("/attendance/chamada", { params: { date } });
    return data;
  },

  async markChamadaBulk(date: string, entries: Array<{ athleteId: string; status: ChamadaAttendanceStatus }>) {
    const { data } = await api.post("/attendance/chamada/bulk", { date, entries });
    return data;
  },
};
