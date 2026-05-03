import { google } from "googleapis";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import {
  normalizeColumnName,
  normalizeEmail,
  normalizePhone,
} from "../athletes/athletes-import.service";

type ImportedApplication = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  position?: string | null;
  contribution?: string | null;
  notes?: string | null;
};

type FormApplication = ImportedApplication & {
  timêstamp?: string | null;
  birthDate?: string | null;
  trainingAvailability?: string | null;
  playsCurrently?: string | null;
  currentTeam?: string | null;
  experienceTime?: string | null;
  level?: string | null;
  championshipAvailability?: string | null;
  motivation?: string | null;
  discoverySource?: string | null;
  referralName?: string | null;
  occupation?: string | null;
  hobbies?: string | null;
};

type ImportError = {
  row: number;
  message: string;
};

const columnAliases: Record<keyof ImportedApplication, string[]> = {
  name: ["nome", "nomecompleto", "atleta", "nomedoatleta"],
  email: ["email", "e-mail", "enderecodeemail"],
  phone: [
    "telefone",
    "whatsapp",
    "celular",
    "fone",
    "telefonewhatsapp",
    "telefoneparacontato",
    "contato",
  ],
  category: ["categoria", "turma", "idade", "categoriaidade"],
  position: ["posição", "posiçãoquejoga", "qualposiçãovocejoga", "funcao"],
  contribution: [
    "comopodecontribuir",
    "contribuicao",
    "contribuicaoparaotime",
    "habilidadeconhecimentoexperiencia",
    "poderiacontribuircomagestao",
    "comoelaachapodecontribuircomotime",
    "comovocepodecontribuircomotime",
    "alemdasuaareadetrabalhoouestudovocetemalgumahabilidadeconhecimentoouexperienciaqueachapoderiacontribuircomagestaoouocrescimentodonossotime",
  ],
  notes: ["observacoes", "obs", "comentarios"],
};

const formColumnAliases: Record<keyof FormApplication, string[]> = {
  ...columnAliases,
  timêstamp: ["carimbodedatahora", "datahora", "timêstamp"],
  birthDate: ["datadenascimento", "nascimento"],
  trainingAvailability: [
    "disponibilidadeparatreinos",
    "vocetemdisponibilidadeparatreinosaossábados1730as1900ginasiojerusalemrlazaradeoliveiraleite200jardimdasacaciassaobernardodocampo",
  ],
  playsCurrently: ["jogaemalgumtimeatualmente"],
  currentTeam: [
    "qualtimeestajogando",
    "searespostaanteriorforsimqualtimeestajogando",
  ],
  experienceTime: ["haquantotempo vocejoga", "haquantotempovocejoga", "tempojogando"],
  level: [
    "nivel",
    "comovoceavaliaseunivelhojeinicianteintermediarioavancado",
  ],
  championshipAvailability: [
    "estadispostoaparticipardecampeonatos",
  ],
  motivation: ["porquevocequerentrarnotime", "motivacao"],
  discoverySource: ["porondevocedescobriuotime", "origem"],
  referralName: [
    "indicacao",
    "casotenhasidoindicacaodealgummembrotimenosinformequemfoi",
  ],
  occupation: ["comoquevocetrabalhaatualmente", "trabalho", "ocupacao"],
  hobbies: ["quaissaoseushobbies", "hobbies"],
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new AppError(
      `Google Sheets de inscricoes não configurado: defina ${name} no ambiente do backend.`,
      400,
    );
  }

  return value;
}

function normalizeOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function getPrivateKey() {
  return getRequiredEnv("GOOGLE_SHEETS_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function findColumnIndex(headers: string[], field: keyof FormApplication) {
  const aliases = formColumnAliases[field].map(normalizeColumnName);
  return headers.findIndex((header) =>
    aliases.some((alias) => aliases.includes(header) || header.includes(alias)),
  );
}

function joinDetails(details: Array<[string, string | null | undefined]>) {
  const lines = details
    .map(([label, value]) => {
      const trimmed = value?.trim();
      return trimmed ? `${label}: ${trimmed}` : null;
    })
    .filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : null;
}

function mapRow(headers: string[], row: string[]): ImportedApplication {
  const getValue = (field: keyof FormApplication) => {
    const index = findColumnIndex(headers, field);
    return index >= 0 ? row[index] : undefined;
  };

  const form: FormApplication = {
    name: normalizeOptional(getValue("name")) ?? undefined,
    email: normalizeEmail(getValue("email")),
    phone: normalizeOptional(getValue("phone")),
    category: normalizeOptional(getValue("category")),
    position: normalizeOptional(getValue("position")),
    contribution: normalizeOptional(getValue("contribution")),
    notes: normalizeOptional(getValue("notes")),
    timêstamp: normalizeOptional(getValue("timêstamp")),
    birthDate: normalizeOptional(getValue("birthDate")),
    trainingAvailability: normalizeOptional(getValue("trainingAvailability")),
    playsCurrently: normalizeOptional(getValue("playsCurrently")),
    currentTeam: normalizeOptional(getValue("currentTeam")),
    experienceTime: normalizeOptional(getValue("experienceTime")),
    level: normalizeOptional(getValue("level")),
    championshipAvailability: normalizeOptional(getValue("championshipAvailability")),
    motivation: normalizeOptional(getValue("motivation")),
    discoverySource: normalizeOptional(getValue("discoverySource")),
    referralName: normalizeOptional(getValue("referralName")),
    occupation: normalizeOptional(getValue("occupation")),
    hobbies: normalizeOptional(getValue("hobbies")),
  };

  const notes = joinDetails([
    ["Carimbo", form.timêstamp],
    ["Data de nascimento", form.birthDate],
    ["Disponibilidade de treino", form.trainingAvailability],
    ["Joga atualmente", form.playsCurrently],
    ["Time atual", form.currentTeam],
    ["Tempo de jogo", form.experienceTime],
    ["Nivel", form.level],
    ["Campeonatos", form.championshipAvailability],
    ["Por que quer entrar", form.motivation],
    ["Como descobriu", form.discoverySource],
    ["Indicacao", form.referralName],
    ["Trabalho/estudo", form.occupation],
    ["Hobbies", form.hobbies],
    ["Habilidade/contribuicao", form.contribution],
    ["Observações", form.notes],
  ]);

  return {
    name: form.name,
    email: form.email,
    phone: form.phone,
    category: form.category,
    position: form.position,
    contribution: form.contribution,
    notes,
  };
}

async function getSheetRows() {
  const auth = new google.auth.JWT({
    email: getRequiredEnv("GOOGLE_SHEETS_CLIENT_EMAIL"),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getRequiredEnv("GOOGLE_SHEETS_APPLICATIONS_SPREADSHEET_ID");
  const range =
    process.env.GOOGLE_SHEETS_APPLICATIONS_RANGE || "Respostas ao formulário 1!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values ?? [];
}

export const athleteApplicationsImportService = {
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
    const [applications, athletes] = await Promise.all([
      prisma.athleteApplication.findMany({
        select: {
          id: true,
          email: true,
          phone: true,
        },
      }),
      prisma.athlete.findMany({
        select: {
          email: true,
          phone: true,
        },
      }),
    ]);
    const existingEmails = new Set(
      [...applications, ...athletes]
        .map((item) => normalizeEmail(item.email))
        .filter(Boolean),
    );
    const existingApplicationsByEmail = new Map(
      applications
        .map((application) => [normalizeEmail(application.email), application])
        .filter(([email]) => Boolean(email)) as Array<[string, (typeof applications)[number]]>,
    );
    const existingApplicationsByPhone = new Map(
      applications
        .map((application) => [normalizePhone(application.phone), application])
        .filter(([phone]) => Boolean(phone)) as Array<[string, (typeof applications)[number]]>,
    );
    const existingPhones = new Set(
      [...applications, ...athletes]
        .map((item) => normalizePhone(item.phone))
        .filter(Boolean),
    );
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const errors: ImportError[] = [];
    let imported = 0;
    let updated = 0;
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

        const existingApplication =
          (emailKey ? existingApplicationsByEmail.get(emailKey) : undefined) ??
          (phoneKey ? existingApplicationsByPhone.get(phoneKey) : undefined);
        const alreadyExistsAsAthlete =
          (emailKey && athletes.some((athlete) => normalizeEmail(athlete.email) === emailKey)) ||
          (phoneKey && athletes.some((athlete) => normalizePhone(athlete.phone) === phoneKey));
        const alreadySeen = Boolean(
          (emailKey && seenEmails.has(emailKey)) || (phoneKey && seenPhones.has(phoneKey)),
        );

        if (existingApplication && !alreadySeen && !alreadyExistsAsAthlete) {
          await prisma.athleteApplication.update({
            where: { id: existingApplication.id },
            data: {
              name: mapped.name,
              email: mapped.email,
              phone: mapped.phone,
              category: mapped.category,
              position: mapped.position,
              contribution: mapped.contribution,
              notes: mapped.notes,
              source: "forms",
            },
          });

          if (emailKey) seenEmails.add(emailKey);
          if (phoneKey) seenPhones.add(phoneKey);
          updated += 1;
          continue;
        }

        if (
          alreadySeen ||
          alreadyExistsAsAthlete ||
          (emailKey && existingEmails.has(emailKey)) ||
          (phoneKey && existingPhones.has(phoneKey))
        ) {
          duplicates += 1;
          continue;
        }

        await prisma.athleteApplication.create({
          data: {
            name: mapped.name,
            email: mapped.email,
            phone: mapped.phone,
            category: mapped.category,
            position: mapped.position,
            contribution: mapped.contribution,
            notes: mapped.notes,
            source: "forms",
            status: "pendente",
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
      updated,
      duplicates,
      errors,
    };
  },
};


