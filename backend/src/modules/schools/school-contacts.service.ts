import { google } from "googleapis";
import { AppError } from "../../middlewares/error.middleware";
import { normalizeColumnName } from "../athletes/athletes-import.service";

export type SchoolContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  sent: boolean;
  response: string | null;
  responsible: string | null;
};

const defaultSchoolSpreadsheetId = "1SCntenT3WIlip2D5eLyVw-wMpq-OembydkSVN7QV7RY";

const columnAliases: Record<keyof Omit<SchoolContact, "id">, string[]> = {
  name: ["escola", "nome", "nomedaescola", "instituicao", "instituicaoensino"],
  phone: ["telefone", "whatsapp", "celular", "fone", "contato"],
  email: ["email", "e-mail", "emaildaescola"],
  sent: ["enviado", "jafoienviado", "enviou", "contatoenviado", "emailenviado", "mensagemenviada"],
  response: ["resposta", "retorno", "feedback"],
  responsible: ["responsavel", "responsável", "quemficouresponsavel", "owner"],
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new AppError(
      `Google Sheets não configurado: defina ${name} no ambiente do backend.`,
      400,
    );
  }

  return value;
}

function getPrivateKey() {
  return getRequiredEnv("GOOGLE_SHEETS_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function normalizeOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function parseBoolean(value?: string) {
  const normalized = normalizeColumnName(value ?? "");
  return ["sim", "s", "yes", "y", "true", "enviado", "ok", "1"].includes(normalized);
}

function findColumnIndex(headers: string[], field: keyof Omit<SchoolContact, "id">) {
  const aliases = columnAliases[field].map(normalizeColumnName);
  return headers.findIndex((header) => aliases.includes(header));
}

function getSpreadsheetIdFromEnv() {
  return process.env.GOOGLE_SHEETS_SCHOOLS_SPREADSHEET_ID || defaultSchoolSpreadsheetId;
}

function quoteSheetName(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

async function getSheetRows() {
  const auth = new google.auth.JWT({
    email: getRequiredEnv("GOOGLE_SHEETS_CLIENT_EMAIL"),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSpreadsheetIdFromEnv();
  let range = process.env.GOOGLE_SHEETS_SCHOOLS_RANGE;

  if (!range) {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const firstSheetTitle = metadata.data.sheets?.[0]?.properties?.title;
    range = firstSheetTitle ? `${quoteSheetName(firstSheetTitle)}!A:Z` : "A:Z";
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values ?? [];
}

export const schoolContactsService = {
  async findAll() {
    const rows = await getSheetRows();
    const headerIndex = rows.findIndex((row) =>
      row.map((cell) => normalizeColumnName(String(cell ?? ""))).some((cell) => cell === "escola"),
    );

    if (headerIndex < 0) {
      return [];
    }

    const headerRow = rows[headerIndex];
    const dataRows = rows.slice(headerIndex + 1);
    const headers = headerRow.map((header) => normalizeColumnName(String(header)));

    return dataRows
      .map((row, index): SchoolContact => {
        const values = row.map((cell) => String(cell ?? ""));
        const getValue = (field: keyof Omit<SchoolContact, "id">) => {
          const columnIndex = findColumnIndex(headers, field);
          return columnIndex >= 0 ? values[columnIndex] : undefined;
        };

        return {
          id: String(headerIndex + index + 2),
          name: normalizeOptional(getValue("name")) ?? "",
          phone: normalizeOptional(getValue("phone")),
          email: normalizeOptional(getValue("email")),
          sent: parseBoolean(getValue("sent")),
          response: normalizeOptional(getValue("response")),
          responsible: normalizeOptional(getValue("responsible")),
        };
      })
      .filter((contact) => contact.name);
  },
};
