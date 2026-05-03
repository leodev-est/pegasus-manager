import { google } from "googleapis";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { getMonthlyPaymentStatusForAthlete } from "./monthly-exemption";

type ImportedAthlete = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  position?: string | null;
  notes?: string | null;
};

type ImportError = {
  row: number;
  message: string;
};

const columnAliases: Record<keyof ImportedAthlete, string[]> = {
  name: ["nome", "nomecompleto", "atleta", "nomedoatleta"],
  email: ["email", "e-mail", "emaildoatleta", "enderecodeemail"],
  phone: ["telefone", "whatsapp", "celular", "fone", "telefonewhatsapp", "contato"],
  category: ["categoria", "turma", "idade", "categoriaidade"],
  position: ["posição", "posição", "funcao", "função"],
  notes: ["observacoes", "observações", "obs", "comentarios", "comentários"],
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

export function normalizeColumnName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeEmail(value?: string | null) {
  const email = value?.trim().toLowerCase();
  return email || null;
}

export function normalizePhone(value?: string | null) {
  const phone = value?.replace(/\D/g, "");
  return phone || null;
}

function normalizeOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function getPrivateKey() {
  return getRequiredEnv("GOOGLE_SHEETS_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function findColumnIndex(headers: string[], field: keyof ImportedAthlete) {
  const aliases = columnAliases[field].map(normalizeColumnName);
  return headers.findIndex((header) => aliases.includes(header));
}

function mapRow(headers: string[], row: string[]): ImportedAthlete {
  const getValue = (field: keyof ImportedAthlete) => {
    const index = findColumnIndex(headers, field);
    return index >= 0 ? row[index] : undefined;
  };

  return {
    name: normalizeOptional(getValue("name")) ?? undefined,
    email: normalizeEmail(getValue("email")),
    phone: normalizeOptional(getValue("phone")),
    category: normalizeOptional(getValue("category")),
    position: normalizeOptional(getValue("position")),
    notes: normalizeOptional(getValue("notes")),
  };
}

async function getSheetRows() {
  const auth = new google.auth.JWT({
    email: getRequiredEnv("GOOGLE_SHEETS_CLIENT_EMAIL"),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getRequiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  const range = process.env.GOOGLE_SHEETS_ATHLETES_RANGE || "Respostas ao formulário 1!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values ?? [];
}

export const athletesImportService = {
  async importFromGoogleSheets() {
    const rows = await getSheetRows();
    const [headerRow, ...dataRows] = rows;

    if (!headerRow) {
      return {
        totalRead: 0,
        imported: 0,
        duplicates: 0,
        errors: [],
      };
    }

    const headers = headerRow.map((header) => normalizeColumnName(String(header)));
    const athletes = await prisma.athlete.findMany({
      select: {
        email: true,
        phone: true,
      },
    });
    const existingEmails = new Set(
      athletes.map((athlete) => normalizeEmail(athlete.email)).filter(Boolean),
    );
    const existingPhones = new Set(
      athletes.map((athlete) => normalizePhone(athlete.phone)).filter(Boolean),
    );
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const errors: ImportError[] = [];
    let imported = 0;
    let duplicates = 0;

    for (const [index, row] of dataRows.entries()) {
      const rowNumber = index + 2;

      try {
        const mapped = mapRow(headers, row.map((cell) => String(cell ?? "")));
        const emailKey = normalizeEmail(mapped.email);
        const phoneKey = normalizePhone(mapped.phone);

        if (!mapped.name) {
          errors.push({ row: rowNumber, message: "Nome ausente" });
          continue;
        }

        if (
          (emailKey && (existingEmails.has(emailKey) || seenEmails.has(emailKey))) ||
          (phoneKey && (existingPhones.has(phoneKey) || seenPhones.has(phoneKey)))
        ) {
          duplicates += 1;
          continue;
        }

        await prisma.athlete.create({
          data: {
            name: mapped.name,
            email: mapped.email,
            phone: mapped.phone,
            category: mapped.category,
            position: mapped.position,
            notes: mapped.notes,
            status: "teste",
            monthlyPaymentStatus: getMonthlyPaymentStatusForAthlete(mapped.name),
          },
        });

        if (emailKey) seenEmails.add(emailKey);
        if (phoneKey) seenPhones.add(phoneKey);
        imported += 1;
      } catch (error) {
        errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Erro ao importar linha",
        });
      }
    }

    return {
      totalRead: dataRows.length,
      imported,
      duplicates,
      errors,
    };
  },
};


