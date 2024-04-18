const os = require("os");
const { statSync } = require("fs");
const { execSync } = require("child_process");
const { getSystemUUID } = require("./heartBeats");

const getBootTime = () => {
  const uptimeInSeconds = os.uptime();
  const currentTime = Date.now() / 1000;
  const bootTime = currentTime - uptimeInSeconds;

  const [dateStr, timeStr] = new Date(bootTime * 1000).toLocaleString().split(", ");

  const [day, month, year] = dateStr.split("/");
  const convertedDate = `${day?.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;

  const [time, period] = timeStr.split(" ");
  let [hours, minutes, seconds] = time.split(":");
  if (period.toLowerCase() === "pm") {
    hours = (parseInt(hours, 10) + 12).toString().padStart(2, "0");
  }

  return `${convertedDate} ${hours}:${minutes}:${seconds}`;
};

const getUpdateTime = () => {
  try {
    const updateLogStats = statSync("C:\\Windows\\WindowsUpdate.log");
    const lastUpdateTime = updateLogStats.mtime;

    const date = lastUpdateTime.getDate().toString().padStart(2, "0");
    const month = (lastUpdateTime.getMonth() + 1).toString().padStart(2, "0");
    const year = lastUpdateTime.getFullYear();

    const hours = lastUpdateTime.getHours().toString().padStart(2, "0");
    const minutes = lastUpdateTime.getMinutes().toString().padStart(2, "0");
    const seconds = lastUpdateTime.getSeconds().toString().padStart(2, "0");

    const formattedLastUpdateTime = `${date}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    return formattedLastUpdateTime;
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const getLastTimeShutdown = () => {
  try {
    const uptime = os.uptime();
    const currentTime = Date.now();
    const lastShutdownTime = new Date(currentTime - uptime * 1000);

    const date = lastShutdownTime.getDate().toString().padStart(2, "0");
    const month = (lastShutdownTime.getMonth() + 1).toString().padStart(2, "0");
    const year = lastShutdownTime.getFullYear();

    const hours = lastShutdownTime.getHours().toString().padStart(2, "0");
    const minutes = lastShutdownTime.getMinutes().toString().padStart(2, "0");
    const seconds = lastShutdownTime.getSeconds().toString().padStart(2, "0");

    const formattedLastShutdownTime = `${date}-${month}-${year} ${hours}:${minutes}:${seconds}`;

    return formattedLastShutdownTime;
  } catch (error) {
    console.error("Error:", error);
  }
};

const getBios = () => {
  try {
    const output = execSync("wmic bios get SMBIOSBIOSVersion")
      .toString()
      .replace("Original Install Date:", "")
      .trim();

    const biosVersionMatch = output.match(/SMBIOSBIOSVersion\s+([\w\d.]+)/);
    const biosVersion = biosVersionMatch ? biosVersionMatch[1] : "N/A";

    return biosVersion;
  } catch (err) {
    console.error("Error:", err);
    return "N/A";
  }
};

const getProcessor = () => {
  try {
    const output = execSync("wmic cpu get Name /format:list");
    const lines = output.toString().trim().split("\r\r\n");
    const processorName = lines
      ?.find((line) => line.startsWith("Name="))
      ?.split("=")[1]
      ?.trim();
    return processorName;
  } catch (err) {
    console.error("Error:", err);
  }
};

const getSystemManufacturer = () => {
  try {
    const output = execSync("wmic csproduct get Vendor");
    const lines = output.toString().trim().split("\r\r\n");
    const systemManufacturer = lines[1].trim();
    return systemManufacturer;
  } catch (err) {
    console.error("Error:", err);
  }
};

const getSystemModel = () => {
  try {
    const output = execSync("wmic csproduct get Name");
    const lines = output.toString().trim().split("\r\r\n");
    const systemModel = lines[1].trim();
    return systemModel;
  } catch (err) {
    console.error("Error:", err);
  }
};

const getSystemType = () => {
  try {
    const output = execSync("wmic computersystem get SystemType");
    const lines = output.toString().trim().split("\r\r\n");
    const systemType = lines[1].trim();
    return systemType;
  } catch (err) {
    console.error("Error:", err);
  }
};

const getDeviceMake = () => {
  try {
    const output = execSync("wmic computersystem get Manufacturer");
    const lines = output.toString().split(/\r\r\n|\n/);
    const deviceMake = lines[1].trim();
    return deviceMake;
  } catch (err) {
    console.error("Error:", err);
  }
};

const getMacId = () => {
  try {
    const output = execSync("wmic nic get MACAddress");
    const lines = output.toString().split(/\r\r\n|\n/);

    const macAddresses = [];
    for (let i = 1; i < lines.length; i++) {
      const macAddress = lines[i].trim();
      if (macAddress !== "") {
        macAddresses.push(macAddress);
      }
    }
    return macAddresses;
  } catch (err) {
    console.error("Error:", err);
  }
};

const getCpuId = () => {
  try {
    const output = execSync("wmic cpu get ProcessorId");
    const lines = output.toString().split(/\r\r\n|\n/);

    let cpuId = "";
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line !== "") {
        cpuId = line;
        break;
      }
    }

    return cpuId;
  } catch (err) {
    console.error("Error:", err);
  }
};

const getRam = () => {
  try {
    const output = execSync("wmic ComputerSystem get TotalPhysicalMemory");
    const lines = output.toString().split(/\r\r\n|\n/);

    let totalRAM = "";
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line !== "") {
        totalRAM = line;
        break;
      }
    }

    if (totalRAM !== "") {
      const totalGB = parseInt(totalRAM) / (1024 * 1024 * 1024);
      return totalGB.toFixed(2);
    } else {
      console.log("Total Installed RAM not found.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
};

const getDeviceDetails = () => {
  const bootDate = getBootTime();
  const updateTime = getUpdateTime();
  const lastTimeShutdown = getLastTimeShutdown();

  return { bootDate, updateTime, lastTimeShutdown };
};

const getSystemHddId = () => {
  const bufferOutput = execSync("wmic diskdrive get serialnumber");
  const hdd_id = bufferOutput.toString();
  const serialNumberMatch = hdd_id.match(/SerialNumber\s+([\w\d_]+)/);
  const serialNumber = serialNumberMatch ? serialNumberMatch[1] : "N/A";

  return serialNumber;
};

const getDriveSerialNumber = () => {
  try {
    const command = `wmic logicaldisk where DeviceID="C:" get VolumeSerialNumber`;
    const bufferOutput = execSync(command);
    const serialNumberMatch = bufferOutput.toString().match(/VolumeSerialNumber\s+([\w\d]+)/);
    const serialNumber = serialNumberMatch ? serialNumberMatch[1] : "N/A";
    return serialNumber;
  } catch (error) {
    return "N/A";
  }
};

const getOsDetails = () => {
  getBootTime();

  const ram = getRam();
  const bios = getBios();
  const mac_id = getMacId();
  const cpu_id = getCpuId();
  const host_name = os.hostname();
  const os_version = os.version();
  const hdd_id = getSystemHddId();
  const processor = getProcessor();
  const system_type = getSystemType();
  const device_make = getDeviceMake();
  const system_model = getSystemModel();
  const mdm_device_id = getSystemUUID();
  const cd_rom_id = getDriveSerialNumber();
  const system_manufacturer = getSystemManufacturer();
  const device_manufacturer = getSystemManufacturer();

  const device_type = "windows";
  const operating_system = "windows";
  const domain = process.env.USERDOMAIN;
  const no_of_cores = os.cpus().length;

  // const networkInterfaces = os.networkInterfaces();
  // Object.keys(networkInterfaces).forEach((interfaceName) => {
  //   const interfaceDetails = networkInterfaces[interfaceName];
  //   console.log(`Interface: ${interfaceName}`);

  //   interfaceDetails.forEach((details) => {
  //     console.log(`  Type: ${details.family}`);
  //     console.log(`  MAC Address: ${details.mac}`);
  //     console.log(`  IP Address: ${details.address}`);
  //     console.log(`  Netmask: ${details.netmask}`);
  //     console.log(`  Internal?: ${details.internal}`);
  //     console.log("------------------------");
  //   });
  // });

  let osDetails = {
    device_type,
    mdm_device_id,
    cpu_id,
    mac_id: mac_id[0],
    host_name,
    operating_system,
    os_version,
    device_manufacturer,
    system_manufacturer,
    device_make,
    system_model,
    system_type,
    processor,
    bios,
    ram,
    no_of_cores,
    domain,
    network_card: "Ethernet",
    hdd_id,
    cd_rom_id,
  };

  return osDetails;
};

module.exports = { getOsDetails, getDeviceDetails };

// const getOperatingSystem = () => {
//   try {
//     const output = execSync("wmic os get Caption, Version");
//     const lines = output.toString().trim().split("\r\r\n");
//     const osInfo = lines[1].trim().split(/\s\s+/);
//     const osCaption = osInfo[0];
//     return osCaption;
//   } catch (err) {
//     console.error("Error:", err);
//   }
// }

// const getProductId = () => {
//   try {
//     const output = execSync("wmic os get SerialNumber");
//     const lines = output.toString().split(/\r\r\n|\n/);

//     let productId = "";
//     for (let i = 1; i < lines.length; i++) {
//       const line = lines[i].trim();
//       if (line !== "") {
//         productId = line;
//         break;
//       }
//     }

//     return productId;
//   } catch (err) {
//     console.error("Error:", err);
//   }
// };

// const getInstallDate = () => {
//   try {
//     const output = execSync('systeminfo | findstr /C:"Original Install Date"')
//       ?.toString()
//       ?.replace("Original Install Date:", "")
//       ?.trim();

//     const [dateStr, timeStr] = output.split(", ");

//     const [day, month, year] = dateStr.split("-");
//     const convertedDate = `${year}-${month}-${day}`;

//     const fullTimeStr = timeStr || "00:00:00";

//     return `${convertedDate}T${fullTimeStr}.000Z`;
//   } catch (err) {
//     console.error("Error:", err);
//   }
// };
