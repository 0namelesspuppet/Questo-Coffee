import QRCode from 'qrcode';
const [,, url, output] = process.argv;
await QRCode.toFile(output, url, { width: 180, margin: 1 });
