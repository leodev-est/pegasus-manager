import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { isMonthlyPaymentExempt } from "./monthly-exemption";

const athleteRoleName = "Atleta";
const temporaryAthletePassword = process.env.ATHLETE_TEMP_PASSWORD ?? "Pegasus@Temp!2025";

function normalizeUsernameBase(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-z0-9._-]/g, "") || "atleta"
  );
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

async function generateUsername(name: string) {
  const base = normalizeUsernameBase(name);
  let username = base;
  let suffix = 1;

  while (await prisma.user.findUnique({ where: { username } })) {
    suffix += 1;
    username = `${base}${suffix}`;
  }

  return username;
}

async function ensureAthleteRole() {
  return prisma.role.upsert({
    where: { name: athleteRoleName },
    update: {
      description: "Perfil Atleta",
    },
    create: {
      name: athleteRoleName,
      description: "Perfil Atleta",
    },
  });
}

async function ensureUserRole(userId: string, roleId: string) {
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
    update: {},
    create: {
      userId,
      roleId,
    },
  });
}

export async function syncActiveAthleteUser(athlete: {
  id: string;
  name: string;
  email: string | null;
  status: string;
}) {
  const email = normalizeEmail(athlete.email);

  if (athlete.status !== "ativo") {
    return null;
  }

  if (isMonthlyPaymentExempt(athlete.name)) {
    return null;
  }

  const role = await ensureAthleteRole();
  const existingByAthlete = await prisma.user.findUnique({
    where: { athleteId: athlete.id },
  });
  const existingByEmail = email
    ? await prisma.user.findUnique({
        where: { email },
      })
    : null;
  const existingUser = existingByAthlete ?? existingByEmail;

  if (existingUser) {
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        active: true,
        athleteId: athlete.id,
        email,
        name: athlete.name,
      },
    });

    await ensureUserRole(user.id, role.id);
    return user;
  }

  const user = await prisma.user.create({
    data: {
      active: true,
      athleteId: athlete.id,
      email,
      mustChangePassword: true,
      name: athlete.name,
      password: await bcrypt.hash(temporaryAthletePassword, 10),
      username: await generateUsername(athlete.name),
    },
  });

  await ensureUserRole(user.id, role.id);
  return user;
}
