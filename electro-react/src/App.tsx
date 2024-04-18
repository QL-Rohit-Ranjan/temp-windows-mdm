import { useEffect, useState } from "react";

import "./App.css";
import RegisterDevice from "./components/RegisterDevice";
import DeviceHasRegistered from "./components/DeviceHasRegistered";

function App() {
  const { isDeviceRegistered, generateQR, showAppVersion, checkServerConnection } = (window as any)
    .bridge;

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [isInternetGone, setIsInternetGone] = useState<boolean>(false);
  const [powerLogsStatus, setPowerLogsStatus] = useState<string | boolean>("");
  const [errorConnectingMqtt, setErrorConnectingMqtt] = useState<string>("");
  const [deviceRegistered, setDeviceRegistered] = useState<boolean | string>(false);
  const [showRegisteredMessage, setShowRegisteredMessage] = useState<boolean>(false);
  const [showSomethingWentWrong, setShowSomethingWentWrong] = useState<boolean>(false);
  const [showDeviceNotRegisteredMsg, setShowDeviceNotRegisteredMsg] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const deviceRegStatus = await isDeviceRegistered();

      if (deviceRegStatus) setDeviceRegistered(true);
      else setQrCodeUrl(await generateQR());

      const vr = await showAppVersion();
      setAppVersion(vr);

      const error = await checkServerConnection();
      console.log({ error });
    })();

    const interval = setInterval(() => {
      if (navigator.onLine) {
        setIsInternetGone(false);
      } else setIsInternetGone(true);
    }, 5_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (deviceRegistered === "DEVICE_REGISTERED_ALREADY") {
      setShowRegisteredMessage(true);

      const timeout = setTimeout(() => {
        setShowRegisteredMessage(false);
        setDeviceRegistered(true);
        clearTimeout(timeout);
      }, 3_000);
    }

    if (deviceRegistered === "DEVICE_NOT_REGISTERED_IN_BACKEND") {
      setShowDeviceNotRegisteredMsg(true);

      const timeout = setTimeout(() => {
        setShowDeviceNotRegisteredMsg(false);
        setDeviceRegistered(false);
        clearTimeout(timeout);
      }, 3_000);
    }

    if (deviceRegistered === "SOMETHING_WENT_WRONG") {
      // THIS MESSAGE INDICATES 502 BAD_GATEWAY (server not responding)
      setShowSomethingWentWrong(true);

      const timeout = setTimeout(() => {
        setShowSomethingWentWrong(false);
        setDeviceRegistered(false);
        clearTimeout(timeout);
      }, 3_000);
    }
  }, [deviceRegistered]);

  return (
    <div>
      {isInternetGone ? (
        <p className="error_para">No Internet Connection</p>
      ) : errorConnectingMqtt ? (
        <p className="error_para">Error connecting server</p>
      ) : null}

      {showRegisteredMessage && <p className="info_para">Device has already been registered</p>}

      {showDeviceNotRegisteredMsg && (
        <p className="error_para">Your device is not registered yet</p>
      )}

      {showSomethingWentWrong && <p className="error_para">Error fetching details from server</p>}

      {powerLogsStatus === "NO_PENDING_POWER_LOGS" ? (
        <p className="info_para">No pending power logs</p>
      ) : powerLogsStatus === "POWER_LOGS_SENT" ? (
        <p className="success_para">Power logs sent successfully</p>
      ) : null}

      {deviceRegistered === true ? (
        <DeviceHasRegistered
          isInternetGone={isInternetGone}
          setPowerLogsStatus={setPowerLogsStatus}
          setErrorConnectingMqtt={setErrorConnectingMqtt}
        />
      ) : (
        <RegisterDevice
          qrCodeUrl={qrCodeUrl}
          isInternetGone={isInternetGone}
          setDeviceRegistered={setDeviceRegistered}
        />
      )}

      <p className="version">Version {appVersion}</p>
      <strong className="environment">PROD</strong>
    </div>
  );
}

export default App;
