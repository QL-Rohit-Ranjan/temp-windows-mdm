import { useEffect, useState } from "react";
import style from "./DeviceHasRegistered.module.css";
import CustomTooltip from "../CustomTooltip";
import { DeviceHasRegisteredInterface } from "./DeviceHasRegistered";

function DeviceHasRegistered({
  isInternetGone,
  setPowerLogsStatus,
  setErrorConnectingMqtt,
}: DeviceHasRegisteredInterface) {
  const { mqttHeartBeatError, getDeviceDetails, sendPowerLogsManually } = (window as any).bridge;

  const [error, setError] = useState<string>("");
  const [deviceDetails, setDeviceDetails] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const device = await getDeviceDetails();
      setDeviceDetails(device);
    })();

    mqttHeartBeatError((arg: string) => {
      setError(arg);
      setErrorConnectingMqtt(arg);
    });
  }, []);

  const handleSendPowerLogs = async () => {
    if (isInternetGone || error) return;

    const resp = await sendPowerLogsManually();
    if (resp === "NO_PENDING_POWER_LOGS") {
      setPowerLogsStatus("NO_PENDING_POWER_LOGS");

      const time = setTimeout(() => {
        setPowerLogsStatus(false);
        clearTimeout(time);
      }, 3_000);
    } else if (resp === "POWER_LOGS_SENT") {
      setPowerLogsStatus("POWER_LOGS_SENT");

      const time = setTimeout(() => {
        setPowerLogsStatus(false);
        clearTimeout(time);
      }, 3_000);
    } else setPowerLogsStatus(false);
  };

  return (
    <div className={style.registered_div}>
      <div className={style.status}>
        <div className={style.title}>Logs</div>
        <ul>
          <li style={{ cursor: "default" }}>Power Logs and status </li>
          <li>
            <CustomTooltip
              text={
                isInternetGone
                  ? "No internet"
                  : error
                  ? "Error connecting server"
                  : "Send power logs"
              }
            >
              <img
                onClick={handleSendPowerLogs}
                className={`${style.img} ${error || isInternetGone ? "" : style.power_button}`}
                style={{ cursor: error || isInternetGone ? "not-allowed" : "pointer" }}
                src="ic_power_logs.SVG"
                alt="power-button"
              />
            </CustomTooltip>
          </li>
        </ul>
      </div>

      <div className={style.status}>
        <div className={style.title}>Service status</div>
        <ul>
          <li>Power Logs status</li>
          <li>
            {isInternetGone ? (
              <CustomTooltip text="Internet connectivity issue">
                <img className={style.img} src="disconnected.SVG" alt="not-conneted" />
              </CustomTooltip>
            ) : error ? (
              <CustomTooltip text="Error connecting server">
                <img className={style.img} src="disconnected.SVG" alt="not-conneted" />
              </CustomTooltip>
            ) : (
              <CustomTooltip text="Active">
                <img className={style.img} src="connected.SVG" alt="conneted" />
              </CustomTooltip>
            )}
          </li>
        </ul>
        <ul>
          <li>Sending heartbeats</li>
          <li>
            {isInternetGone ? (
              <CustomTooltip text="Error sending heartbeats">
                <img className={style.img} src="disconnected.SVG" alt="not-conneted" />
              </CustomTooltip>
            ) : error ? (
              <CustomTooltip text="Error connecting server">
                <img className={style.img} src="disconnected.SVG" alt="not-conneted" />
              </CustomTooltip>
            ) : (
              <CustomTooltip text="Sending heartbeats">
                <img className={style.img} src="connected.SVG" alt="conneted" />
              </CustomTooltip>
            )}
          </li>
        </ul>
        <ul></ul>
      </div>

      <div className={style.status}>
        <div className={style.title}>Application Details</div>
        <ul>
          <li>
            <span>Device was register at :&nbsp;</span>
            {deviceDetails?.registerTime || "null"}
          </li>
        </ul>
        {/* <ul>
          <li>
            <span>Device was update at:&nbsp;</span>
            {deviceDetails?.updateTime}
          </li>
        </ul> */}
        <ul>
          <li>
            <span>Device last booted at :&nbsp;</span>
            {deviceDetails?.bootDate || "null"}
          </li>
        </ul>
      </div>
    </div>
  );
}

export default DeviceHasRegistered;
