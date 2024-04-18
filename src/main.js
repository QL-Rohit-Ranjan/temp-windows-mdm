const fs = require("fs");
const path = require("path");
const mqtt = require("mqtt");
const QRCode = require("qrcode");
const {
  PING_TOPIC,
  POWER_LOGS_TOPIC,
  getSystemUUID,
  publishMessageToMqtt,
  subscribeToMqttBroker,
  sendMessageAsHeartBeat,
} = require("./functions/heartBeats");
const Store = require("electron-store");
const isReachable = require("is-reachable");
const { autoUpdater } = require("electron-updater");
const makeAppAutoLaunch = require("./functions/autoLaunch");
const { getOsDetails, getDeviceDetails } = require("./functions/deviceInfo");
const { default: ElectronShutdownHandler } = require("@paymoapp/electron-shutdown-handler");
const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, powerMonitor } = require("electron");

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let tray;
let sleepTime;
let mainWindow;
let fristHit = true;

const APP_NAME = "MDM";
const store = new Store();
const DIR_PATH = __dirname;
const desktopPath = path.join(require("os").homedir(), "Desktop");
const iconPath = path.join(desktopPath, `${APP_NAME} App.lnk`);

// PRODUCTION (below)
const GET_TOKENS_URL = "https://apis-mdm.edcloud.in/api/v1/device-login";
const client = mqtt.connect({
  port: 1883,
  host: "mdmbroker.edcloud.in",
  username: "device",
  password: "5WvQJyQI8nDxB3p8Vt0M",
});

// DEVELOPMENT (below)
// const GET_TOKENS_URL = "https://apis-mdm.qkkalabs.com/api/v1/device-login";
// const client = mqtt.connect({
//   port: 1883,
//   host: "3.20.142.121",
//   username: "user1",
//   password: "admin",
// });

const formatDateFromTimestamp = (timestamp) => {
  const milliseconds = parseInt(timestamp);
  const date = new Date(milliseconds);
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are zero-based
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const formattedDay = day < 10 ? "0" + day : day;
  const formattedMonth = month < 10 ? "0" + month : month;
  const formattedHours = hours < 10 ? "0" + hours : hours;
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
  const formattedSeconds = seconds < 10 ? "0" + seconds : seconds;

  const formattedDate = `${formattedDay}-${formattedMonth}-${year} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

  return formattedDate;
};

const saveDeviceRegisterTimeInStore = async () => {
  try {
    const req = await fetch("http://worldtimeapi.org/api/timezone/Etc/UTC");
    const data = await req.json();

    const timeStamp = Date.parse(new Date(data.utc_datetime));
    store.set("register_time", formatDateFromTimestamp(timeStamp));
  } catch (error) {
    console.log("Error fetching time: ", error);
  }
};

const showWindowIfHidden = () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    BrowserWindow.getAllWindows()[0].show();
  }
};

const deleteAppIcon = () => {
  if (fs.existsSync(iconPath)) {
    try {
      fs.unlinkSync(iconPath);
    } catch (err) {
      console.error("Error deleting icon:", err.message);
    }
  }
  // else {
  //   console.log("Icon does not exist on the desktop.");
  // }
};

const getTimeUntilMidnight = () => {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 55);

  return endOfDay - now;
};

const restartApp = () => {
  if (getTokensFromStore()) {
    updateStopPowerLogs("stop");
  }

  setTimeout(() => {
    app.relaunch();
    app.exit();
  }, 10_000);
};

const showNotification = (title, body) => {
  new Notification({
    title,
    body,
    icon: path.join(DIR_PATH, "logo_large.png"),
  }).show();
};

const isInternetAvailable = async () => {
  return await isReachable("https://www.google.com");
};

const timestampToISODate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
};

const handleSystemTrayIcon = (tray, image, tooltip) => {
  tray.setImage(path.join(DIR_PATH, image));
  tray.setToolTip(tooltip);
};

const getTokensFromStore = () => {
  const access_token = store.get("access_token");

  if (access_token) return true;
  else return false;
};

const setPowerLogsInStore = (status) => {
  const arr = store.get("power_logs") || [];
  const time = new Date().toISOString();

  if (
    arr[arr.length - 1]?.status === status ||
    arr[arr.length - 1]?.timestamp > new Date(time).getTime()
  )
    return;

  arr.push({ status, timestamp: new Date(time).getTime() });
  store.set("power_logs", arr);
};

const updateStopPowerLogs = (status, timeValue) => {
  const arr = store.get("power_logs") || [];
  const time = timeValue || new Date().toISOString();

  if (arr[arr.length - 1]?.status === "stop") {
    const val = arr.pop();

    if (fristHit) {
      sleepTime = val.timestamp;
      fristHit = false;
    } else fristHit = true;

    arr.push({ status, timestamp: new Date(time).getTime() });
    store.set("power_logs", arr);
  }
};

const getPowerLogsFromStore = () => {
  const allLogs = store.get("power_logs");
  const dates = autoConvertPowerLogsFormat(allLogs);
  const filteredData = dates
    .map((item) => ({
      ...item,
      deviceStatus: item.deviceStatus.filter((status) => Object.keys(status).length > 1),
    }))
    .filter((item) => item.deviceStatus.length > 0);

  if (dates && dates?.length) {
    const powerLogs = {
      deviceId: getSystemUUID(),
      dates: filteredData,
    };

    publishMessageToMqtt(client, powerLogs, POWER_LOGS_TOPIC);
    autoOverwriteStoreData();
  }
};

const autoConvertPowerLogsFormat = (inputData) => {
  if (inputData && inputData.length) {
    const sortedArray = inputData.sort((a, b) => a.timestamp - b.timestamp);

    const todayDate = timestampToISODate(Date.now());
    const convertedData = sortedArray.reduce((result, { status, timestamp }) => {
      const dateKey = timestampToISODate(timestamp);

      if (dateKey === todayDate) {
        return result;
      }

      const dateEntry = result.find((entry) => entry.date === dateKey);
      if (dateEntry) {
        if (status === "start") {
          dateEntry.deviceStatus.push({ powerUpTs: timestamp });
        } else if (status === "stop") {
          const lastStatus = dateEntry.deviceStatus.pop();
          if (lastStatus) {
            lastStatus.powerDownTs = timestamp;
            dateEntry.deviceStatus.push(lastStatus);
          }
        }
      } else {
        result.push({
          date: dateKey,
          deviceStatus: [{ powerUpTs: timestamp }],
        });
      }

      return result;
    }, []);

    return convertedData;
  } else return undefined;
};

const autoOverwriteStoreData = () => {
  const arr = [];
  const logsArray = store.get("power_logs");
  const todayDate = timestampToISODate(Date.now());

  logsArray?.forEach((log) => {
    const logDate = timestampToISODate(log.timestamp);
    if (todayDate === logDate) {
      arr.push(log);
    }
  });

  store.delete("power_logs");

  const time = setTimeout(() => {
    store.set("power_logs", arr);
    clearTimeout(time);
  }, 500);
};

// MANUAL CONVERT POWER LOGS FORMAT
// THIS FUNCTION WILL GET CALLED WHEN USER CLICK ON "Send powerlogs" BUTTON
// THIS WILL SEND POWERLOGS OF CURRENT DATE EXCEPT CURRENT SESSION'S LOGS
const manuallyConvertPowerLogsFormat = (inputData) => {
  const sortedArray = inputData?.sort((a, b) => a.timestamp - b.timestamp);
  const convertedData = sortedArray.reduce((result, { status, timestamp }) => {
    const dateKey = timestampToISODate(timestamp);

    const dateEntry = result.find((entry) => entry.date === dateKey);
    if (dateEntry) {
      if (status === "start") {
        dateEntry.deviceStatus.push({ powerUpTs: timestamp });
      } else if (status === "stop") {
        const lastStatus = dateEntry.deviceStatus.pop();
        if (lastStatus) {
          lastStatus.powerDownTs = timestamp;
          dateEntry.deviceStatus.push(lastStatus);
        }
      }
    } else {
      result.push({
        date: dateKey,
        deviceStatus: [{ powerUpTs: timestamp }],
      });
    }

    return result;
  }, []);

  return convertedData;
};

// MANUALLY DELETE POWER LOGS
// THIS WILL DELETE ALL POWER LOGS EXCEPT CURRENT SESSION'S LOGS
const manuallyOverwriteStoreData = () => {
  const dates = store.get("power_logs")?.slice(-2);
  store.delete("power_logs");

  const time = setTimeout(() => {
    store.set("power_logs", dates);
    clearTimeout(time);
  }, 500);
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    title: `${APP_NAME}`,
    icon: DIR_PATH + "/logo_large.png",
    width: 320,
    height: 500,
    maxWidth: 320,
    maxHeight: 500,
    maximizable: false,
    minimizable: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(DIR_PATH, "preload.js"),
    },
  });

  mainWindow.loadURL(path.join(DIR_PATH, "../electro-react/build/index.html"));
  mainWindow.center();
  // mainWindow.webContents.openDevTools();
  Menu.setApplicationMenu(null);

  // ***** HOLD SYSTEM SHUTDOWN (for 700 milliseconds) TO LOG SHUT-DOWN TIME AS POWER_LOG AND QUIT *****
  ElectronShutdownHandler.setWindowHandle(mainWindow.getNativeWindowHandle());
  ElectronShutdownHandler.blockShutdown("Please wait for some data to be saved");

  ElectronShutdownHandler.on("shutdown", () => {
    client.end((err) => {
      if (err) {
        console.error("Error while disconnecting MQTT:", err);
      }
    });

    app.quit();

    const time = setTimeout(() => {
      ElectronShutdownHandler.releaseShutdown();

      clearTimeout(time);
    }, 500);
  });
  // ***** TILL HERE *****

  mainWindow.on("close", (event) => {
    if (app.isQuitting) {
      mainWindow = null;
    } else {
      event.preventDefault();
      mainWindow.hide();
    }
  });
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      else if (!mainWindow.isVisible()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("ready", async () => {
    deleteAppIcon();
    makeAppAutoLaunch(app);
    tray = new Tray(path.join(DIR_PATH, "inactive.png"));

    if (process.platform === "win32") {
      app.setAppUserModelId(`${APP_NAME} system activity tracker`);
    }

    if (await isInternetAvailable()) {
      autoUpdater.checkForUpdates();
    } else {
      showNotification(
        `${APP_NAME} App`,
        "Internet connectivity issue.\nPlease check your internet connection."
      );
    }

    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Open",
          click: showWindowIfHidden,
        },
      ])
    );

    tray.addListener("click", showWindowIfHidden);

    ipcMain.on("checkForUpdates", () => {
      autoUpdater.downloadUpdate();
      // autoUpdater.on("update-available", () => {
      // });
      autoUpdater.on("update-downloaded", () => {
        autoUpdater.quitAndInstall();
      });
    });

    powerMonitor.on("resume", () => {
      if (getTokensFromStore()) {
        updateStopPowerLogs("stop", sleepTime);
        setPowerLogsInStore("start");

        const time = setTimeout(() => {
          setPowerLogsInStore("stop");
          clearTimeout(time);
        }, 1_000);
      }
    });

    // WILL SHOW NOTIFICATION TO REGISTER DEVICE AFTER EVERY 1 HOUR IF DEVICE IS NOT REGISTERED
    const interval = setInterval(() => {
      if (!getTokensFromStore()) {
        showNotification(
          `${APP_NAME} App`,
          "Your device is not registered yet.\n Kindly register your device."
        );
      } else clearInterval(interval);
    }, 36_00_000);

    if (!getTokensFromStore()) {
      createWindow();
      handleSystemTrayIcon(tray, "inactive.png", `${APP_NAME} Service (Inactive)`);
    } else {
      setPowerLogsInStore("start");

      const time = setTimeout(() => {
        setPowerLogsInStore("stop");
        clearTimeout(time);
      }, 1_000);

      setInterval(() => {
        updateStopPowerLogs("stop");
      }, 60_000);
    }

    setTimeout(restartApp, getTimeUntilMidnight());

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    if (getTokensFromStore()) {
      updateStopPowerLogs("stop");
    }

    app.isQuitting = true;
  });
}

client.on("connect", async () => {
  // console.log("Connected to MQTT broker");
  subscribeToMqttBroker(client, PING_TOPIC);
  subscribeToMqttBroker(client, POWER_LOGS_TOPIC);

  try {
    // ***** CHECKS EVERYTIME WHEN APP STARTS THAT IS DEVICE REGISTERED IN THE BACKEND OR NOT *****
    // ***** IF DEVICE IS NOT REGISTERED, IT'LL CLEAR THE ELECTRON STORE (tokens and powerlogs from storage) *****
    // ***** AND RE-OPENS THE WINDOW *****
    const req = await fetch(GET_TOKENS_URL, {
      method: "POST",
      body: JSON.stringify({ deviceId: getSystemUUID() }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    });
    const resp = await req.json();

    if (resp?.statusCode === 110) {
      store.clear();
      mainWindow?.reload();
      mainWindow?.show();

      // if (!mainWindow) {
      //   createWindow();
      // } else if (!mainWindow.isVisible()) {
      //   mainWindow.show();
      // }

      // if (!mainWindow.isVisible()) {
      //   mainWindow.show();
      // }

      handleSystemTrayIcon(tray, "inactive.png", `${APP_NAME} Service (Inactive)`);
    }
    // ***** TILL HERE *****
    else {
      if (getTokensFromStore()) {
        getPowerLogsFromStore();

        sendMessageAsHeartBeat(client);
        setInterval(() => {
          sendMessageAsHeartBeat(client);
        }, 60_000);

        if (mainWindow && app.isReady()) {
          mainWindow?.webContents.send("mqttHeartBeatError", "");
        }

        handleSystemTrayIcon(tray, "active.png", `${APP_NAME} Service (Active)`);
      }
    }
  } catch (error) {
    // console.log("Error occured fetching tokens: ->", error);
  }
});

client.on("error", (error) => {
  // console.error("MQTT Error: ", `Code: ${error?.code}, Message:`, error?.message);

  if (mainWindow) {
    mainWindow?.webContents.send("mqttHeartBeatError", error?.message);
  }

  if (app.isReady()) {
    handleSystemTrayIcon(tray, "inactive.png", `${APP_NAME} Service (Inactive)`);
  }
});

client.on("close", () => {
  if (mainWindow) {
    mainWindow?.webContents.send("mqttHeartBeatError", "ERROR_OCCURED_CONNECTING_MQTT");
    // console.log("Connection to MQTT broker closed");
  }
});

ipcMain.handle("saveTokens", async () => {
  if (getTokensFromStore()) {
    return "DEVICE_REGISTERED_ALREADY";
  }

  try {
    const req = await fetch(GET_TOKENS_URL, {
      method: "POST",
      body: JSON.stringify({ deviceId: getSystemUUID() }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    });
    const resp = await req.json();

    if (resp?.statusCode !== 109) {
      throw new Error(resp?.statusCode);
    } else {
      store.set("access_token", resp?.data?.access_token || "");
      await saveDeviceRegisterTimeInStore();

      setPowerLogsInStore("start");
      const time = setTimeout(() => {
        setPowerLogsInStore("stop");
        clearTimeout(time);
      }, 1_000);

      sendMessageAsHeartBeat(client);
      setInterval(() => {
        updateStopPowerLogs("stop");
        sendMessageAsHeartBeat(client);
      }, 60_000);

      handleSystemTrayIcon(tray, "active.png", `${APP_NAME} Service (Active)`);
      return true;
    }
  } catch (error) {
    if (error.toString().includes(110)) {
      return "DEVICE_NOT_REGISTERED_IN_BACKEND";
    } else if (error.toString().includes("Unexpected token '<'")) {
      return "SOMETHING_WENT_WRONG"; // THIS ERROR MESSAGE INDICATES 502 BAD GATEWAY (server not responding)
    } else return { error };
  }
});

ipcMain.handle("generateQR", async () => {
  const systemDetails = getOsDetails();
  const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(systemDetails));
  return qrCodeUrl;
});

ipcMain.handle("getDeviceDetails", async () => {
  const systemDetails = getOsDetails();
  const deviceDetails = getDeviceDetails();
  const registerTime = store.get("register_time");

  return { ...deviceDetails, ...systemDetails, registerTime };
});

ipcMain.handle("isDeviceRegistered", () => {
  if (getTokensFromStore()) return true;
  else return false;
});

ipcMain.handle("sendPowerLogsManually", () => {
  const currentLogs = store.get("power_logs")?.slice(0, -2);
  const dates = manuallyConvertPowerLogsFormat(currentLogs);
  const filteredData = dates
    .map((item) => ({
      ...item,
      deviceStatus: item.deviceStatus.filter((status) => Object.keys(status).length > 1),
    }))
    .filter((item) => item.deviceStatus.length > 0);

  if (dates && dates?.length) {
    const powerLogs = {
      deviceId: getSystemUUID(),
      dates: filteredData,
    };

    publishMessageToMqtt(client, powerLogs, POWER_LOGS_TOPIC);
    manuallyOverwriteStoreData();

    return "POWER_LOGS_SENT";
  } else {
    return "NO_PENDING_POWER_LOGS";
  }
});

ipcMain.handle("checkServerConnection", async () => {
  try {
    const req = await fetch(GET_TOKENS_URL, {
      method: "POST",
      body: JSON.stringify({ deviceId: getSystemUUID() }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    });
    await req.json();
    return "NO_ERROR_FOUND_CONNECTING_SERVER, 😄";
  } catch (error) {
    return error;
  }
});

ipcMain.handle("showAppVersion", () => require("../package.json").version);
