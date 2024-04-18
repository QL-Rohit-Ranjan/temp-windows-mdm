export interface DeviceHasRegisteredInterface {
  isInternetGone: boolean;
  setErrorConnectingMqtt: (value: string) => void;
  setPowerLogsStatus: (value: string | boolean) => void;
}
