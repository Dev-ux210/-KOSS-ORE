import { app, BrowserWindow, shell, ipcMain } from "electron";
import * as path from "path";
import * as http from "http";
import * as fs from "fs";
import * as net from "net";
import { spawn, ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let staticServer: http.Server | null = null;
let backendPort = 8000;

function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, "127.0.0.1", () => {
      server.close(() => resolve(startPort));
    });
    server.on("error", () => {
      // If startPort is taken, let OS assign a free port
      const randomServer = net.createServer();
      randomServer.listen(0, "127.0.0.1", () => {
        const address = randomServer.address() as net.AddressInfo;
        const port = address.port;
        randomServer.close(() => resolve(port));
      });
    });
  });
}

function pollHealth(url: string, timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.setTimeout(1500, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

function startStaticServer(outDir: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".woff2": "font/woff2",
      ".txt": "text/plain",
    };

    staticServer = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url?.split("?")[0] || "/");
      if (reqPath === "/") reqPath = "/index.html";

      let filePath = path.join(outDir, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      if (!fs.existsSync(filePath)) {
        filePath = path.join(outDir, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end("Internal Server Error");
        } else {
          res.writeHead(200, {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
          });
          res.end(content, "utf-8");
        }
      });
    });

    staticServer.listen(0, "127.0.0.1", () => {
      const address = staticServer?.address() as net.AddressInfo;
      resolve(address.port);
    });

    staticServer.on("error", reject);
  });
}

async function startBackend(port: number, dataDir: string): Promise<ChildProcess> {
  const isPackaged = app.isPackaged;
  process.env.ORE_BACKEND_PORT = String(port);
  process.env.ORE_DATA_DIR = dataDir;
  process.env.ORE_DESKTOP_MODE = "1";

  if (isPackaged) {
    const binaryName = process.platform === "win32" ? "ore-backend.exe" : "ore-backend";
    const binaryPath = path.join(process.resourcesPath, "bin", binaryName);
    console.log(`Launching packaged backend binary from: ${binaryPath}`);
    return spawn(binaryPath, ["--port", String(port), "--data-dir", dataDir], {
      stdio: "pipe",
      detached: false,
    });
  } else {
    // Development mode
    const mainPyPath = path.resolve(__dirname, "../../backend/app/main.py");
    console.log(`Launching development backend from: ${mainPyPath}`);
    return spawn("python3", [mainPyPath, "--port", String(port), "--data-dir", dataDir], {
      stdio: "pipe",
      detached: false,
    });
  }
}

function killBackendProcess() {
  if (backendProcess) {
    console.log("Terminating backend process...");
    try {
      if (process.platform === "win32" && backendProcess.pid) {
        spawn("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"]);
      } else {
        backendProcess.kill("SIGTERM");
      }
    } catch (e) {
      console.error("Error terminating backend:", e);
    }
    backendProcess = null;
  }
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
}

async function createWindow(uiPort: number) {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    title: "ORE — Academic Knowledge & Local RAG",
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Handle external link clicks
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  const appUrl = `http://127.0.0.1:${uiPort}`;
  console.log(`Loading ORE UI from: ${appUrl}`);
  await mainWindow.loadURL(appUrl);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  ipcMain.on("open-external", (_, url: string) => {
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      shell.openExternal(url);
    }
  });

  const dataDir = path.join(app.getPath("userData"), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  backendPort = await findFreePort(8000);
  console.log(`Selected backend port: ${backendPort}`);

  try {
    backendProcess = await startBackend(backendPort, dataDir);

    backendProcess.stdout?.on("data", (data) => {
      console.log(`[backend stdout]: ${data}`);
    });
    backendProcess.stderr?.on("data", (data) => {
      console.error(`[backend stderr]: ${data}`);
    });

    // Wait for health endpoint
    const healthUrl = `http://127.0.0.1:${backendPort}/health`;
    console.log(`Waiting for backend health check at: ${healthUrl}...`);
    const isHealthy = await pollHealth(healthUrl, 25000);

    if (!isHealthy) {
      console.warn("Backend took longer than expected to initialize.");
    }

    // Start static UI server or connect to Next.js dev server
    let uiPort = 3000;
    if (app.isPackaged) {
      const outDir = path.join(process.resourcesPath, "app", "out");
      console.log(`Serving static production build from: ${outDir}`);
      uiPort = await startStaticServer(outDir);
    } else {
      // In dev mode, check if out directory exists, otherwise use dev server
      const devOutDir = path.resolve(__dirname, "../../frontend/out");
      if (fs.existsSync(devOutDir)) {
        uiPort = await startStaticServer(devOutDir);
      } else {
        uiPort = 3000;
      }
    }

    await createWindow(uiPort);
  } catch (err) {
    console.error("Failed to initialize ORE desktop app:", err);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
      createWindow(3000);
    }
  });
});

app.on("before-quit", killBackendProcess);
app.on("will-quit", killBackendProcess);
process.on("exit", killBackendProcess);
process.on("SIGINT", () => {
  killBackendProcess();
  process.exit(0);
});
process.on("SIGTERM", () => {
  killBackendProcess();
  process.exit(0);
});
