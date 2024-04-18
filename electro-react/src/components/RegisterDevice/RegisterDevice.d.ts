export interface RegisterDevicePropsInterface {
  qrCodeUrl: string;
  isInternetGone: boolean;
  setDeviceRegistered: (value: boolean | string) => void;
}
