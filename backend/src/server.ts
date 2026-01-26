import "dotenv/config";
import { createApp } from "./app.js";
import { PrismaDayRepository } from "./adapters/PrismaDayRepository.js";
import { PrismaLedgerRepository } from "./adapters/PrismaLedgerRepository.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createApp(new PrismaDayRepository(), new PrismaLedgerRepository());

app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
