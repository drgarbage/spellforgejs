import axios from "axios";
import { base64Raw2URL } from "../utils";

const LOCALHOST = 'http://localhost:7680';

const api = (options) => {
  const opt = {
    host: LOCALHOST,
    ...options
  };

  if(opt.host === LOCALHOST) console.warn('Be aware, initialing SDAPI on local machine, please make sure the stable-diffusion-webui is running on same maching as you running this script.');
  if(!opt.host) throw new Error('host is required.');

  const adpt = axios.create({
    baseURL: opt.host,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const task = async (url, body, options) => {
    const { timeout = 20000, interval = 1000 } = options;
    
    let timer, checker = !!options.onProgress && setInterval(async () => {
      const { data } = await adpt.request(`/sdapi/v1/progress?skip_current_image=${!preview}`);
      const { progress, current_image } = data;
      const progressImage = !current_image ? undefined : base64Raw2URL(current_image);
      options.onProgress(Math.round(progress * 100), progressImage);
    }, interval);

    return Promise.race([
      adpt.request(url, body).then(rs => resolve(rs.data)),
      new Promise((_r, rej) => timer = setTimeout(() => rej('Operation Timeout.'), timeout))
    ]).finally(() => {
      clearTimeout(timer);
      clearInterval(checker);
    });
  }

  return {
    txt2img: (body, options) => task('/sdapi/v1/txt2img', {method: 'POST', body}),
    img2img: (body, options) => task('/sdapi/v1/img2img', {method: 'POST', body}),
    upscale: (body, options) => task('/sdapi/v1/extra-single-image', {method: 'POST', body}),
    samplers: () => adpt.request('/sdapi/v1/samplers').then(rs => rs.data),
    upscalers: () => adpt.request('/sdapi/v1/upscalers').then(rs => rs.data),
    sdmodels: () => adpt.request('/sdapi/v1/sd-models').then(rs => rs.data),
    embeddings: () => adpt.request('/sdapi/v1/embeddings').then(rs => rs.data), 
    interrogate: (image, model = 'clip') => adpt.request('/sdapi/v1/interrogate', {method: 'POST', body: {image, model}}).then(rs => rs.data),
    progress: (preview = false) => adpt.request(`/sdapi/v1/progress?skip_current_image=${!preview}`).then(rs => rs.data),
    infos: async () => {
      const infopaths = {
        'samplers': '/adapi/v1/samplers',
        'upscalers': '/adapi/v1/upscalers',
        'sdmodels': '/adapi/v1/sd-models',
        'embeddings': '/adapi/v1/embeddings'
      };
      const results = await Promise.all(
        Object
          .keys(infopaths)
          .map(key => 
            adpt
              .request(infopaths[key])
              .then(rs => ({[key]:rs.data}))
          )
      );

      return results.reduce((p,c) => ({...p, ...c}), {});
    },
  };
}

export default api;