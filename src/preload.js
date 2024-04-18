const { contextBridge, ipcRenderer } = require("electron");
const Store = require("electron-store");
const store = new Store();

contextBridge.exposeInMainWorld("bridge", {
  generateQR: () => ipcRenderer.invoke("generateQR"),
  saveTokens: () => ipcRenderer.invoke("saveTokens"),
  showAppVersion: () => ipcRenderer.invoke("showAppVersion"),
  getDeviceDetails: () => ipcRenderer.invoke("getDeviceDetails"),
  isDeviceRegistered: () => ipcRenderer.invoke("isDeviceRegistered"),
  sendPowerLogsManually: () => ipcRenderer.invoke("sendPowerLogsManually"),
  checkServerConnection: () => ipcRenderer.invoke("checkServerConnection"),
  mqttHeartBeatError: (callback) =>
    ipcRenderer.on("mqttHeartBeatError", (_e, value) => callback(value)),
});

document.addEventListener("DOMContentLoaded", () => {
  const time = setTimeout(() => {
    ipcRenderer.send("checkForUpdates");
    clearTimeout(time);
  }, 10_000);
});

const GET_DUMMY_POWER_LOGS = () => {
  const arr = store.get("power_logs") || [];
  const newArr = arr.map((item) => {
    return {
      status: item.status,
      timestamp: new Date(item.timestamp).toString(),
    };
  });

  return newArr;
};

const time = setTimeout(() => {
  console.log(GET_DUMMY_POWER_LOGS());
  clearTimeout(time);
}, 2_000);

// ipcRenderer.on("inside-update-check-function", () => console.log("inside-update-check-function"));
// ipcRenderer.on("checking-for-update", () => console.log("checking-for-update"));
// ipcRenderer.on("update-available", () => console.log("update-available"));
// ipcRenderer.on("update-not-available", () => console.log("update-not-available"));
// ipcRenderer.on("download-progress", (_e, args) => console.log("download-progress", args));
