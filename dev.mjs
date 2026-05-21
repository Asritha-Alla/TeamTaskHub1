import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import readline from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const parsed = {};
  const contents = readFileSync(filePath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) {
      parsed[key] = value;
    }
  }

  return parsed;
}

const isWindows = process.platform === "win32";
const pnpmCommand = "pnpm";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const envFileValues = loadEnvFile(path.join(projectRoot, ".env"));

async function findAvailablePort(preferredPort) {
  for (let port = preferredPort; port < preferredPort + 100; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on("error", () => resolve(false));
      server.listen(port, "0.0.0.0", () => {
        server.close(() => resolve(true));
      });
    });

    if (available) {
      return port;
    }
  }

  throw new Error(`Unable to find an open port near ${preferredPort}`);
}

const services = [
  {
    name: "api-server",
    port: 8080,
    args: ["--filter", "@workspace/api-server", "run", "dev"],
    env: {
      NODE_ENV: "development",
    },
  },
  {
    name: "task-app",
    port: 3000,
    args: ["--filter", "@workspace/task-app", "run", "dev"],
    env: {
      BASE_PATH: "/",
      NODE_ENV: "development",
    },
  },
];

const children = [];
let shuttingDown = false;
let apiResolvedPort = null;

async function startService(service, resolvedPort) {
  const child = spawn(pnpmCommand, service.args, {
    env: {
      ...process.env,
      ...envFileValues,
      ...service.env,
      PORT: String(resolvedPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWindows,
    windowsHide: true,
  });

  const prefixStream = (stream, label) => {
    const lines = readline.createInterface({ input: stream });
    lines.on("line", (line) => {
      process.stdout.write(`[${label}] ${line}\n`);
    });
    return lines;
  };

  const stdoutLines = prefixStream(child.stdout, service.name);
  const stderrLines = prefixStream(child.stderr, service.name);

  child.once("exit", (code, signal) => {
    stdoutLines.close();
    stderrLines.close();

    if (shuttingDown) {
      return;
    }

    if (code !== 0) {
      shuttingDown = true;
      console.error(`[${service.name}] exited with code ${code ?? "null"}${signal ? ` signal ${signal}` : ""}`);
      stopAll(child.pid);
      process.exit(code ?? 1);
    }
  });

  child.once("error", (error) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.error(`[${service.name}] failed to start`);
    console.error(error);
    stopAll(child.pid);
    process.exit(1);
  });

  children.push(child);
}

function stopAll(exceptPid) {
  for (const child of children) {
    if (child.pid === exceptPid) {
      continue;
    }

    if (!child.killed) {
      child.kill();
    }
  }
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}, stopping dev servers...`);
  stopAll();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

for (const service of services) {
  // eslint-disable-next-line no-await-in-loop
  const resolvedPort = await findAvailablePort(service.port);

  // expose the api server port to the frontend via VITE_API_BASE so dev frontend can call the backend
  if (service.name === "api-server") {
    apiResolvedPort = resolvedPort;
  }

  if (service.name === "task-app") {
    service.env = {
      ...service.env,
      VITE_API_BASE: `http://localhost:${apiResolvedPort ?? service.port}`,
    };
  }

  // eslint-disable-next-line no-await-in-loop
  startService(service, resolvedPort);
}
