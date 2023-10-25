import axios from "axios";

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

export const base64Raw2URL = (base64, mimeType = 'image/png') => {
  return `data:${mimeType};base64,${base64}`;
}

export const imageURL2Base64URL = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const base64 = Buffer.from(response.data, 'binary').toString('base64');
  const mimeType = response.headers['content-type'];
  return base64Raw2URL(base64, mimeType);
}

export const imageFile2Base64URL = async (file) => {
  if (isNode) {
    // todo: must install fs, file-type manually
    const fs = require('fs').promises;
    const data = await fs.readFile(file);
    const fileType = require('file-type');
    const mimeType = fileType(data)?.mime || 'application/octet-stream';
    const base64 = Buffer.from(data).toString('base64');
    return base64Raw2URL(base64, mimeType);
  }

  if (isReactNative) {
    // todo: must install react-native-fs manually
    const RNFS = require('react-native-fs');
    // 在 React Native 中，我们可能需要依赖其他方式来确定 MIME 类型
    const base64 = await RNFS.readFile(file, 'base64');
    const mimeType = 'image/png'; // 假设是 PNG，根据实际情况修改或动态确定
    return base64Raw2URL(base64, mimeType);
  }

  // 在 Web 环境中
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

export const removeInfoFromBase64URL = () => {}