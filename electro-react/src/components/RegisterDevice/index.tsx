import { useEffect, useRef, useState } from "react";
import style from "./RegisterDevice.module.css";

import Loading from "../Loading";
import { RegisterDevicePropsInterface } from "./RegisterDevice";

const GET_TOKENS_URL = "https://apis-mdm.edcloud.in/api/v1/device-login";

function RegisterDevice({
  qrCodeUrl,
  isInternetGone,
  setDeviceRegistered,
}: RegisterDevicePropsInterface) {
  const { saveTokens, getDeviceDetails } = (window as any).bridge;

  const saveTokensButtonRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const device = await getDeviceDetails();
        const req = await fetch(GET_TOKENS_URL, {
          method: "POST",
          body: JSON.stringify({ deviceId: device?.mdm_device_id }),
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
        });
        const resp = await req.json();
        if (resp?.statusCode === 109 && saveTokensButtonRef.current) {
          saveTokensButtonRef.current.click();
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, [isInternetGone]);

  const handleSaveTokens = async () => {
    if (isInternetGone) return;

    setIsRegistering(true);
    const isTokensSaved = await saveTokens();

    if (isTokensSaved === true) {
      setIsRegistering(false);
      setDeviceRegistered(true);
    } else if (isTokensSaved === "DEVICE_REGISTERED_ALREADY") {
      setDeviceRegistered("DEVICE_REGISTERED_ALREADY");
      setIsRegistering(false);
    } else if (isTokensSaved === "DEVICE_NOT_REGISTERED_IN_BACKEND") {
      setDeviceRegistered("DEVICE_NOT_REGISTERED_IN_BACKEND");
      setIsRegistering(false);
    } else if (isTokensSaved === "SOMETHING_WENT_WRONG") {
      setDeviceRegistered("SOMETHING_WENT_WRONG");
      setIsRegistering(false);
    } else {
      setIsRegistering(false);
      setDeviceRegistered(false);
      console.log(isTokensSaved);
    }
  };

  return (
    <div className={style.qr_code_div}>
      <h1>Scan QR code to register your device.</h1>

      <div className={style.loading} style={{ display: isLoading ? "none" : "block" }}>
        <Loading />
      </div>

      <img
        src={qrCodeUrl}
        alt="qr-code"
        onLoad={() => setIsLoading(true)}
        style={{ display: isLoading ? "block" : "none" }}
      />

      {isLoading && (
        <button
          className={style.button}
          onClick={handleSaveTokens}
          disabled={isRegistering || isInternetGone}
          ref={saveTokensButtonRef}
        >
          {isRegistering ? "Loading..." : "Register Device"}
        </button>
      )}
    </div>
  );
}

export default RegisterDevice;
