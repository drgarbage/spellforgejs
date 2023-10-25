import axios from "axios";

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

export const base64Raw2URL = (base64, mimeType = 'image/png') => {
  return `data:${mimeType};base64,${base64}`;
}

export const base64URL2Raw = (base64URL) => {
  if(!base64URL.startsWith('data:')) throw new Error('Incorrect base64 URL format.');
  const [type, base64] = base64URL.split(',');
  if(!base64) throw new Error('Incorrect base64 URL format.');
  return base64;
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

const parseParameters = (parameters) => {
  if(!parameters) return {};
  const COLUMNS = {
    'Negative prompt': 'negative_prompt', 
    'Steps': 'steps', // int
    'Sampler': 'sampler_index',  
    'CFG scale': 'cfg_scale', // float
    'Seed': 'seed', // int
    'Size': 'size', 
    'Model hash': 'model_hash'
  };
  const indexOfNegative = parameters.indexOf('Negative prompt:');
  const indexofSteps = parameters.indexOf('Steps:');
  const hasNegative = indexOfNegative >= 0;
  const promptEndIndex = hasNegative ? indexOfNegative : indexofSteps;
  
  const prompt = parameters.substr(0, promptEndIndex);
  const negative_prompt = hasNegative ? 
    { negative_prompt: parameters.substr(indexOfNegative, indexofSteps - indexOfNegative).split(':')[1].trim() } : 
    {};
    
  const rest = parameters.substr(indexofSteps);
  
  const columns = rest.split(',').map(pair => {

    const [key, value] = pair.split(':').map(v => v.trim());
    
    if(key === 'Size') {
      const [width, height] = value.split('x').map(v => parseInt(v));
      return { width, height };
    }

    if(key === 'Model hash') {
      return {
        override_settings: {
          sd_model_checkpoint: value
        }
      };
    }

    if(['CFG scale'].indexOf(key) >= 0) {
      return ({[COLUMNS[key]]:parseFloat(value)});
    }

    if(['Steps', 'Seed'].indexOf(key) >= 0) {
      return ({[COLUMNS[key]]:parseInt(value)});
    }

    return ({[COLUMNS[key]]:value});

  }).reduce((p,v) => ({...p, ...v}), {});

  return {
    prompt,
    ...negative_prompt,
    ...columns
  };
}

export const infoFromBase64URL = (base64URL) => {
  const buffer = new Uint8Array(Buffer.from(base64URL2Raw(base64URL), 'base64'));
  const parameters = getMetadata(buffer, 'parameters');
  const info = parseParameters(parameters);
  return info;
}

export const updateInfoOfBase64URL = (base64URL, info = {}) => {
  let buffer = new Uint8Array(Buffer.from(base64URL2Raw(base64URL), 'base64'));
  for(let key in info)
    buffer = addMetadata(buffer, key, info[key]);
  const base64 = Buffer.from(buffer).toString('base64');
  return base64Raw2URL(base64, mimeType);
}

export const removeInfoOfBase64URL = (base64URL) =>
  updateInfoOfBase64URL(base64URL, { parameters: '' });