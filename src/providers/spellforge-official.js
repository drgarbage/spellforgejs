import axios from "axios";
import { DEFAULT_HOST } from '../constants';
import { base64Raw2URL, imageURL2Base64URL, removeUndefined, sleep } from "../utils";

const parseParams = (p) => {
  const { 
    prompt, size, n,
    image, mask, resize,
    advanceOptions,
    requirements
  } = p;
  const [width, height] = size ? size.split('x') : [undefined, undefined];
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

  return removeUndefined(params);
}

const sfapi = (options) => {
  const opt = {
    apiKey: null,
    credential: null,
    ...options
  };

  if(!opt.apiKey) throw new Error('API Key is required.');
  if(!opt.credential) throw new Error('Unauthorized.');
  
  const protocol = typeof(window) !== 'undefined' && window.location ? window.location.protocol : 'https:';
  const baseURL = `${protocol}//${DEFAULT_HOST}`;
  const adpt = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': opt.credential ? `Bearer ${opt.credential}` : undefined,
      'ApiKey': opt.apiKey,
    }
  });

  const task = async (api, params, options = {}) => {
    const { timeout = 20000, interval = 1000 } = options;
    let timer, interrupt = false;
    let response = await adpt.post('/api/aigc', { api, params, mode: 'pass' } );
    let { id: taskId, progress, progressImage, result } = response.data;

    return Promise.race([
      (async () => {
        while (!interrupt && progress < 1) {
          try{
            await sleep(interval);
            const { data } = await adpt.get(`/api/aigc/${taskId}/result`);
            progress = data.progress;
            progressImage = data.progressImage;
            result = data.result;

            if(typeof options.onProgress !== 'function') continue;
            if(!progressImage) continue;
            const imageURL = `${baseURL}/api/ipfs/${progressImage}`;
            const progressImageBase64URL = await imageURL2Base64URL(imageURL);
            options.onProgress(Math.round(progress * 100), progressImageBase64URL);
          }catch(err){
            console.error(err);
          }
        }

        if(!result.images) return result;

        const imageLoaders = result.images.map(cid => imageURL2Base64URL(`${baseURL}/api/ipfs/${cid}`));
        const images = await Promise.all(imageLoaders);

        return { ...result, images };
      })(),
      new Promise((_r, rej) => timer = setTimeout(() => rej(new Error('Operation Timeout.')), timeout))
    ]).finally(() => {
      clearTimeout(timer);
      interrupt = true;
    });
  };

  return {
    txt2img: (body, options) => task('txt2img', parseParams(body), options),
    img2img: (body, options) => task('img2img', parseParams(body), options),
    upscale: (body, options) => task('img2img', parseParams(body), options),
    samplers: () => adpt.request('/api/aigc/samplers').then(rs => rs.data),
    upscalers: () => adpt.request('/api/aigc/upscalers').then(rs => rs.data),
    sdmodels: () => adpt.request('/api/aigc/sd-models').then(rs => rs.data),
    embeddings: () => adpt.request('/api/aigc/embeddings').then(rs => rs.data), 
    loras: () => adpt.request('/api/aigc/loras').then(rs => rs.data), 
    // interrogate: (image, model = 'clip') => adpt.request('/sdapi/v1/interrogate', {method: 'POST', body: {image, model}}).then(rs => rs.data),
    infos: async () => {
      const infopaths = {
        'samplers': '/api/aigc/samplers',
        'upscalers': '/api/aigc/upscalers',
        'sdmodels': '/api/aigc/sd-models',
        'embeddings': '/api/aigc/embeddings',
        'loras': '/api/aigc/loras',
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

export default sfapi;