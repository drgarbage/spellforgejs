# SpellForge Client

Client library for SpellForge image generation service.

## Features

- Simple UI for AI Image Generation.
- Provide abstract interface adapter to supported generation services.
- Proxy to personal generation host.
- Supports Task Queue.
- Supports Stable-Diffusion-WebUI.
- Supports DALL-E.
- txt2img generation.
- img2img generation.
- Supports ReactJS.
- Supports NodeJS.
- Supports React Native.

## Installation

**npm**

```
npm install spellforge
```

**yarn**

```
yarn add spellforge
```

## Usage

```
import spellforge from 'spellforge';

const api = spellforge({

  // default
  // provider: 'SPELLFORGE',
  apiKey: 'QWedLmfbXyz',
  secret: '002fe283f8d0283',

  // direct access to stable-diffusion-webui
  // provider: 'SDAPI_V1',
  // host: 'http://path/to/stable-diffusion-webui/sdapi',

  // direct access to openAI
  // provider: 'DALL_E',
  // openAIApiKey: 'sgx-abjifEsjifexo',

});


const { images } = await api.txt2img({
  prompt: 'a painting of beautiful scene',
  // size: '512x512',
  // n: 1,
});

console.log(images[0]);
// data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4QAqR...
```