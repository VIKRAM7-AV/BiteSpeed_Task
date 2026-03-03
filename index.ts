import 'dotenv/config';
import { PrismaPg } from "@prisma/adapter-pg";
import {PrismaClient} from '@prisma/client';

const adapter = new PrismaPg();
const prisma = new PrismaClient({ adapter });