const dalle = require('./providers/dalle');
const sdapi = require('./providers/sdapi');
const sf = require('./providers/spellforge-official');

const txt2imgParams = {
  prompt: 'a beautiful painting',
  size: '512x512',
  n: 1,
  advanceOptions: undefined, // stabld-diffusion options
  requirements: undefined, // features required for this request
}

const img2imgParams = {
  image: '', // base64Image
  mask: '', // base64Image
  prompt: '',
  size: '512x512',
  resize: 'cover', // 'cover' | 'contain' | 'fill'
  n: 1,
  advanceOptions: undefined, // stabld-diffusion options
  requirements: undefined, // features required for this request
}

const PROVIDERS = {
  DALLE_E: "DALL_E",
  SDAPI_V1: "SDAPI_V1",
  SPELLFORGE: "SPELLFORGE"
}

const api = (options) => {

  var provider = null;

  switch(options.provider) {
    case PROVIDERS.DALLE_E: 
      provider = dalle(options);
      break;
    case PROVIDERS.SDAPI_V1: 
      provider = sdapi(options);
      break;
    case PROVIDERS.SPELLFORGE: 
      provider = sf(options);
      break;
  }

  return {
    providers: () => PROVIDERS.values(),
    txt2img: (body, options) => provider.txt2img(body, options),
    img2img: (body, options) => provider.img2img(body, options),
    upscale: (body, options) => provider.upscale(body, options),
    infos: () => provider.infos(),
  };
}

export default api;