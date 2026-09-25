import { contextBridge, ipcRenderer } from "electron";

const apiPort = process.env.ORE_BACKEND_PORT || "8000";

contextBridge.exposeInMainWorld("oreConfig", {
  apiUrl: `http://127.0.0.1:${apiPort}`,
  platform: process.platform,
  isDesktop: true,
  openExternal: (url: string) => {
    ipcRenderer.send("open-external", url);
  },
});
