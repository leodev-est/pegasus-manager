import { api } from "./api";

export type Suggestion = {
  id: string;
  message: string;
  anonymous: boolean;
  authorId: string | null;
  authorName: string | null;
  status: string;
  response: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SuggestionPayload = {
  message: string;
  anonymous?: boolean;
};

export const suggestionService = {
  async submit(payload: SuggestionPayload) {
    const { data } = await api.post<Suggestion>("/suggestions", payload);
    return data;
  },

  async getAll(status?: string) {
    const { data } = await api.get<Suggestion[]>("/suggestions", {
      params: status ? { status } : undefined,
    });
    return data;
  },

  async respond(id: string, update: { status?: string; response?: string }) {
    const { data } = await api.patch<Suggestion>(`/suggestions/${id}`, update);
    return data;
  },
};
