import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";
import { type IdentifyResult } from '../types.js';


const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });


export async function identifyContact(email?: string, phoneNumber?: string): Promise<IdentifyResult> {

  const matchingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : {},
        phoneNumber ? { phoneNumber } : {},
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('Matching contacts:', matchingContacts);

  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        linkPrecedence: 'primary',
      },
    });

    return {
      contact: {
        primaryContatctId: newContact.id,
        emails: newContact.email ? [newContact.email] : [],
        phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
        secondaryContactIds: [],
      },
    };
  }


  let primary = matchingContacts[0]!;
  while (primary.linkedId !== null) {
    const linkedId = primary.linkedId;
    primary = await prisma.contact.findUniqueOrThrow({ where: { id: linkedId } });
  }

  const allInChain = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id },
      ],
    },
  });

  const emailsSet = new Set<string>();
  const phonesSet = new Set<string>();
  const secondaryIds: number[] = [];

  allInChain.forEach((c) => {
    if (c.email) emailsSet.add(c.email);
    if (c.phoneNumber) phonesSet.add(c.phoneNumber);
    if (c.id !== primary.id && c.linkPrecedence === 'secondary') {
      secondaryIds.push(c.id);
    }
  });

  return {
    contact: {
      primaryContatctId: primary.id,
      emails: [primary.email, ...Array.from(emailsSet).filter(e => e !== primary.email)].filter(Boolean) as string[],
      phoneNumbers: [primary.phoneNumber, ...Array.from(phonesSet).filter(p => p !== primary.phoneNumber)].filter(Boolean) as string[],
      secondaryContactIds: secondaryIds,
    },
  };
}