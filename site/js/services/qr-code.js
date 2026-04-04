import qrcode from "../vendor/qrcode-generator.mjs";

export function createQrCodeDataUrl(text) {
  const qr = qrcode(0, "L");
  qr.addData(text);
  qr.make();
  return qr.createDataURL(12, 2);
}
