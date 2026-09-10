import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed-data";

const prisma = new PrismaClient();

runSeed(prisma)
  .then(({ items }) => {
    console.log(`\n  HATCH seed complete — ${items} items.`);
    console.log("  Student student@hatch.dev · Admin admin@hatch.dev · Runner runner@hatch.dev");
    console.log("  password: hatch1234\n");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
