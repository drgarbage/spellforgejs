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

    const reportProgress = async (progress, progressImage) => {
      if(interrupt) return;
      if(typeof options.onProgress !== 'function') return;
      if(progress >= 1) return;
      try{
        if(progressImage) {
          const imageURL = progressImage;
          const progressImageBase64URL = await imageURL2Base64URL(imageURL).catch(() => "");
          await options.onProgress(progress, progressImageBase64URL);
        } else {
          await options.onProgress(progress);
        }
      }catch(err){
        console.error(err);
      }
    }

    return Promise.race([
      (async () => {
        while (!interrupt && !result?.images?.[0] && progress < 1) {
          try{
            await sleep(interval);
            const { data } = await adpt.get(`/api/aigc/${taskId}/result`);
            progress = data.progress;
            progressImage = data.progressImage;
            result = data.result;
            await reportProgress(progress, progressImage);
          }catch(err){
            console.error('spellforge: error:', err);
          }
        }
        interrupt = true;

        if(!result?.images) return result;

        const imageLoaders = result.images.map(url => imageURL2Base64URL(url));
        const images = await Promise.all(imageLoaders);

        console.info('spellforge: complete');
        return { ...result, images };
      })(),
      new Promise((_r, rej) => timer = setTimeout(() => {
        interrupt = true;
        console.info('spellforge: interrupt with timeout.');
        rej(new Error('Operation Timeout.'));
      }, timeout))
    ]).finally(() => {
      clearTimeout(timer);
      interrupt = true;
      timer = null;
      console.info('spellforge: finished');
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