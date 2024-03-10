import axios from "axios";
import { base64Raw2URL, removeUndefined } from "../utils";

const LOCALHOST = 'http://localhost:7680';

const parseParams = (p) => {
  const { 
    prompt, size, n,
    image, mask, resize,
    advanceOptions,
    requirements
  } = p;
  const [width, height] = size ? size.split('x').map((item) => parseInt(item) || undefined) : [undefined, undefined];
  const init_images = image ? [image] : undefined;
  const resize_mode = resize ? ['fill','cover','contain'].indexOf(resize) : undefined;
  const params = {
    prompt,
    width, height,
    n_iter: n,
    init_images,
    mask,
    resize_mode,
    ...advanceOptions,
  };

  removeUndefined(params);

  return params;
}

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

  const task = async (url, params, options = {}) => {
    const { timeout = 20000, interval = 1000 } = options;
    
    let timer, checker = typeof options.onProgress === 'function' && setInterval(async () => {
      const { data } = await adpt.get(`/sdapi/v1/progress?skip_current_image=false`);
      const { progress, current_image } = data;
      const progressImage = !current_image ? undefined : base64Raw2URL(current_image);
      options.onProgress(progress, progressImage);
    }, interval);

    return Promise.race([
      adpt.request(url, params).then(rs => rs.data),
      new Promise((_r, rej) => timer = setTimeout(() => rej('Operation Timeout.'), timeout))
    ]).finally(() => {
      clearTimeout(timer);
      clearInterval(checker);
    });
  }

  return {
    txt2img: (data, options) => task('/sdapi/v1/txt2img', {method: 'POST', data: parseParams(data)}),
    img2img: (data, options) => task('/sdapi/v1/img2img', {method: 'POST', data: parseParams(data)}),
    upscale: (data, options) => task('/sdapi/v1/extra-single-image', {method: 'POST', data: parseParams(data)}),
    samplers: () => adpt.request('/sdapi/v1/samplers').then(rs => rs.data),
    upscalers: () => adpt.request('/sdapi/v1/upscalers').then(rs => rs.data),
    sdmodels: () => adpt.request('/sdapi/v1/sd-models').then(rs => rs.data),
    embeddings: () => adpt.request('/sdapi/v1/embeddings').then(rs => rs.data), 
    interrogate: (image, model = 'clip') => adpt.request('/sdapi/v1/interrogate', {method: 'POST', data: {image, model}}).then(rs => rs.data),
    progress: (preview = false) => adpt.request(`/sdapi/v1/progress?skip_current_image=${!preview}`).then(rs => rs.data),
    infos: async () => {
      const infopaths = {
        'samplers': '/sdapi/v1/samplers',
        'upscalers': '/sdapi/v1/upscalers',
        'sdmodels': '/sdapi/v1/sd-models',
        'embeddings': '/sdapi/v1/embeddings'
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