import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const distServer = path.join(root, "dist", "server.js");
const prismaEnginePaths = [
  path.resolve(root, "..", "node_modules", ".prisma", "client", "query_engine-windows.dll.node"),
  path.resolve(root, "node_modules", ".prisma", "client", "query_engine-windows.dll.node")
];

let tscProc;
let serverProc;
let shuttingDown = false;

const spawnProcess = (cmd, args) =>
  spawn(cmd, args, { stdio: "inherit", cwd: root, shell: true });

const spawnAndWait = (cmd, args) =>
  new Promise((resolve) => {
    const proc = spawnProcess(cmd, args);
    proc.on("exit", (code) => resolve(code ?? 0));
  });

const prismaEngineExists = () => prismaEnginePaths.some((enginePath) => existsSync(enginePath));

const runPrismaGenerate = async () => {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const code = await spawnAndWait("npx", ["prisma", "generate"]);
    if (code === 0) {
      return true;
    }
    const code2 = await spawnAndWait("npx", ["prisma", "migrate"]);
    if (code2 === 0) {
      return true;
    }
    if (prismaEngineExists()) {
      console.warn(
        "Prisma generate failed, but query engine already exists. Continuing dev server."
      );
      return true;
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
};

const startServerIfReady = () => {
  if (serverProc || shuttingDown) {
    return;
  }
  if (existsSync(distServer)) {
    serverProc = spawnProcess("node", ["--watch", distServer]);
    serverProc.on("exit", (code) => {
      if (shuttingDown) return;
      if (code && code !== 0) {
        shutdown(code);
      }
    });
    return;
  }
  setTimeout(startServerIfReady, 200);
};

const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (serverProc) serverProc.kill("SIGTERM");
  if (tscProc) tscProc.kill("SIGTERM");
  process.exit(code);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const main = async () => {
  const prismaOk = await runPrismaGenerate();
  if (!prismaOk) {
    shutdown(1);
    return;
  }

  console.log("Starting tsc in watch mode...");
  tscProc = spawnProcess("npx", ["tsc", "-w", "--preserveWatchOutput"]);

  tscProc.on("exit", (code) => {
    if (shuttingDown) return;
    if (code && code !== 0) {
      shutdown(code);
    }
  });

  startServerIfReady();
};

main().catch((err) => {
  console.error(err);
  shutdown(1);
});
