import OpenAI from "openai";

const api = (options) => {
  const opt = {
    openAIApiKey: null,
    ...options
  };

  if(!opt.openAIApiKey) 
    throw new Error('Missing API Key for DALL-E, please visit https://platform.openai.com/account/api-keys to generate your own API key.');

  const openai = new OpenAI({apiKey: opt.openAIApiKey});
  
  return {
    txt2img: (body, options) => openai.images.generate(body),
    img2img: (body, options) => openai.images.edit(body),
    upscale: (body, options) => openai.images.edit(body),
    infos: () => ({}),
  };
}

export default api;