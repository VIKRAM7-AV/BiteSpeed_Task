import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";
import { type IdentifyResult } from '../types.js';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export async function identifyContact(
  email?: string,
  phoneNumber?: string
): Promise<IdentifyResult> {

  const incomingEmail = email?.trim().toLowerCase() || null;
  const incomingPhone = phoneNumber?.trim() || null;

  if (!incomingEmail && !incomingPhone) {
    throw new Error("At least email or phoneNumber is required");
  }

  // Find the all contacts to match the email and phoneNumber
  const matchingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        incomingEmail ? { email: incomingEmail } : {},
        incomingPhone ? { phoneNumber: incomingPhone } : {},
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

// if no one the matching contacts to create the new contact as primary
  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: incomingEmail,
        phoneNumber: incomingPhone,
        linkPrecedence: 'primary',
      },
    });

    return buildResponse(newContact, []);
  }


  let primary = matchingContacts[0];
  while (primary.linkedId !== null) {
    primary = await prisma.contact.findUniqueOrThrow({
      where: { id: primary.linkedId },
    });
  }


  const allPrimaries = matchingContacts.filter(
    (c) => c.linkPrecedence === 'primary' && c.linkedId === null
  );

  if (allPrimaries.length > 1) {
    const oldestPrimary = allPrimaries.reduce((prev, curr) =>
      prev.createdAt < curr.createdAt ? prev : curr
    );

    await prisma.$transaction(async (tx) => {
      for (const p of allPrimaries) {
        if (p.id !== oldestPrimary.id) {
          await tx.contact.update({
            where: { id: p.id },
            data: {
              linkedId: oldestPrimary.id,
              linkPrecedence: 'secondary',
              updatedAt: new Date(),
            },
          });
        }
      }
    });

    primary = oldestPrimary;
  }

  const hasEmailMatch = matchingContacts.some((c) => c.email === incomingEmail);
  const hasPhoneMatch = matchingContacts.some((c) => c.phoneNumber === incomingPhone);

  const needsNewSecondary =
    (incomingEmail && !hasEmailMatch) ||
    (incomingPhone && !hasPhoneMatch);

  if (needsNewSecondary) {
    await prisma.contact.create({
      data: {
        email: incomingEmail,
        phoneNumber: incomingPhone,
        linkedId: primary.id,
        linkPrecedence: 'secondary',
      },
    });
  }

  // Fetch the all contacts to linked the primary contact
  const chainContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  return buildResponse(primary, chainContacts.slice(1));
}


function buildResponse(
  primary: { id: number; email: string | null; phoneNumber: string | null },
  secondaries: Array<{ id: number; email: string | null; phoneNumber: string | null }>
): IdentifyResult {
  const emails = new Set<string>();
  const phones = new Set<string>();

  if (primary.email) emails.add(primary.email);
  if (primary.phoneNumber) phones.add(primary.phoneNumber);

  secondaries.forEach((s) => {
    if (s.email) emails.add(s.email);
    if (s.phoneNumber) phones.add(s.phoneNumber);
  });

  const emailList = Array.from(emails);
  const phoneList = Array.from(phones);

  return {
    contact: {
      primaryContatctId: primary.id,
      emails: [
        primary.email || "",
        ...emailList.filter((e) => e !== primary.email),
      ].filter(Boolean),
      phoneNumbers: [
        primary.phoneNumber || "",
        ...phoneList.filter((p) => p !== primary.phoneNumber),
      ].filter(Boolean),
      secondaryContactIds: secondaries.map((s) => s.id),
    },
  };
}

export async function getAllContacts() {
  return await prisma.contact.findMany({
    orderBy: { createdAt: 'asc' },
  });
}