# Bragi Canvas — model catalogue

This is a snapshot of the hardcoded model catalogue (`plugin/src/models/`). The authoritative list for a given session is whatever `list_models` returns — it filters by which provider keys the user has configured and which provider-model pairs are connected in settings. Use this doc only to *understand* each model's purpose and typical params.

Model IDs below are exact strings to pass as `modelId` in `generate`.

---

## Image models

| Model | `modelId` | Providers | Modes | Key params |
|-------|-----------|-----------|-------|-----------|
| GPT Image 2 | `gpt-image-2` | OpenAI / fal.ai / TokenRouter / APIMart | text-to-image | `aspectRatio` (15 + Auto), `imageSize` (Auto/1K/2K/4K), `quality` (Auto/Low/Medium/High) |
| Nano Banana Pro | `nano-banana-pro` | Gemini / fal.ai / TokenRouter | text-to-image | `aspectRatio` (10), `imageSize` (1K/2K/4K) |
| Nano Banana 2 | `nano-banana-2` | Gemini / fal.ai / TokenRouter | text-to-image | `aspectRatio` (14), `imageSize` (512/1K/2K/4K) |
| Grok Imagine | `grok-imagine` | xAI / fal.ai | text-to-image, image-ref-to-image | `aspectRatio` (9), `quality` |
| Midjourney v8 | `midjourney-v8` | Legnext | text-to-image | `ar` (10), `quality`, `stylize` (0–1000) |
| Midjourney niji 7 | `midjourney-niji-7` | Legnext | text-to-image | `ar` (7), `stylize` |
| Luma Uni-1 | `luma-uni-1` | Luma | text-to-image, image-ref-to-image | `aspectRatio` (5) |
| Seedream 5.0 | `seedream-5.0` | Volcengine | text-to-image | `aspectRatio` (8), `resolution` (2K/3K) |
| Seedream 4.5 | `seedream-4.5` | Volcengine / TokenRouter | text-to-image | `aspectRatio` (8), `resolution` (2K/4K) |

GPT Image 2's OpenAI and OpenAI-compatible image routes convert `imageSize` + `aspectRatio` into a concrete pixel `size`; APIMart sends the selected aspect ratio as `size` and the same tier as its `resolution` field.

---

## Video models

| Model | `modelId` | Providers | Modes | Key params |
|-------|-----------|-----------|-------|-----------|
| Seedance 2.0 | `seedance-2.0` | Volcengine / BytePlus / fal.ai / TokenRouter / Token360 | text-to-video, first-frame, image-ref, video-ref | `duration` (Auto/4–15s), `ratio` (5), `resolution` (480p/720p/1080p), `generate_audio` |
| Seedance 2.0 Fast | `seedance-2.0-fast` | Volcengine / BytePlus / TokenRouter / Token360 | same as above | `duration`, `ratio` (3), `resolution` (480p/720p), `generate_audio` |
| Kling 3.0 | `kling-3.0` | Kling / fal.ai / TokenRouter | text-to-video, first-frame, first-last-frame | `duration` (5/10s), `aspect_ratio`, `mode` (std/pro) |
| Kling 2.6 | `kling-2.6` | Kling / TokenRouter | same as 3.0 | same |
| HappyHorse 1.0 T2V | `happyhorse-1.0-t2v` | TokenRouter | text-to-video | provider defaults |
| HappyHorse 1.0 I2V | `happyhorse-1.0-i2v` | TokenRouter | first-frame | requires one upstream image |
| Wan 2.7 Spicy I2V | `wan-2.7-i2v-spicy` | MuleRouter | first-frame | requires one upstream image; optional upstream audio; `resolution` (720p/1080p), `duration` (2–15s), `prompt_extend` |
| Veo 3.1 | `veo-3.1` | Gemini / fal.ai | text-to-video, first-frame, first-last-frame, image-ref (≤3) | `durationSeconds` (4/6/8s), `aspectRatio` (16:9/9:16), `resolution` (720p/1080p) |
| Veo 3.1 Lite | `veo-3.1-lite` | Gemini | text-to-video, first-frame (no image-ref) | same as 3.1 |
| Grok Video | `grok-video` | xAI / fal.ai | text-to-video, first-frame, image-ref, video-extend | `duration`, `aspect_ratio` (7), `resolution` (480p/720p/1080p) |
| Omni-Flash-Ext | `omni-flash-ext` | APIMart | text-to-video, first-frame, multi-image-ref, video-ref | `duration` (4/6/8/10s), `resolution` (720p/1080p/4k), `aspect_ratio` (16:9/9:16) |

**All video generations are async.** `generate` returns `generation_started` and the result lands on the canvas minutes later.

TokenRouter Seedance maps `seedance-2.0` / `seedance-2.0-fast` to Dreamina model IDs and accepts reference images, audio, and videos. When both a TokenRouter key and TokenRouter Asset group ID are configured, Bragi routes reference images/audio/videos through that explicit ModelArk group and passes them as `asset://...`; without a group ID, local refs use temporary HTTPS URLs. BytePlus and Volcengine keep their own provider-scoped asset IDs.

Token360 Seedance uses the official `seedance-2.0` / `seedance-2.0-fast` model IDs through `https://api.token360.ai/v1`. Without a Token360 Asset group ID, Bragi uploads local reference media to temporary HTTPS URLs. With an Asset group ID configured, Token360 image refs are uploaded as RealFace / Virtual Portrait assets, cached on the source node, and sent as `asset://ta_...`; audio and video refs still use HTTPS URLs.

MuleRouter Wan 2.7 Spicy I2V requires a connected upstream image and can use the first connected upstream audio as `audio_url`. Bragi uploads local image/audio refs to temporary HTTPS URLs before calling MuleRouter.

APIMart Omni-Flash-Ext accepts 0, 1, or 3 reference images and at most 1 reference video. Bragi re-uploads every APIMart image/video reference through the temporary Bragi Relay before sending `image_urls` / `video_urls`; APIMart never receives data URIs or third-party source URLs. When using `video-ref`, Bragi omits `duration` because APIMart derives timing from the reference video.

---

## Text models

| Model | `modelId` | Providers | Multimodal inputs (active provider) |
|-------|-----------|-----------|-------------------------------------|
| Claude Opus 4.7 | `claude-opus-4-7` | Anthropic / AWS Bedrock / TokenRouter | image + PDF (Anthropic/Bedrock/APIMart-style slugs); no video/audio |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Anthropic / Bedrock / TokenRouter | image + PDF |
| Gemini 3.5 Flash | `gemini-3.5-flash` | Gemini / TokenRouter | image + PDF + video + audio |
| Gemini 3 Flash | `gemini-3-flash` | Gemini / TokenRouter | full multimodal on Gemini / gemini slugs |
| Gemini 3.1 Pro | `gemini-3.1-pro` | Gemini / TokenRouter | full multimodal on Gemini / gemini slugs |
| Grok 4.3 | `grok-4-3` | xAI / TokenRouter | image + PDF on xAI / `x-ai/*` TokenRouter slugs |
| Grok 4 Fast | `grok-4-fast` | xAI / TokenRouter | image + PDF on xAI / `x-ai/*` TokenRouter slugs |
| Qwen 3.6 Plus | `qwen-3-6-plus` | DashScope / TokenRouter | image + PDF + video + audio on DashScope; qwen slugs on TokenRouter |
| GPT-5.5 Pro | `gpt-5.5-pro` | OpenAI / TokenRouter / APIMart | image + PDF |
| GPT-5.5 | `gpt-5.5` | OpenAI / TokenRouter / APIMart | image + PDF |

Text model output is a text node. Bragi validates upstream media against a model × provider capability matrix before calling the provider. OpenAI, xAI, and APIMart GPT models use the Responses API for image/PDF refs. Anthropic and Bedrock send PDFs as `document` blocks (≤32 MB). Gemini keeps small images inline and uploads large or non-image refs through Bragi Relay as `fileData.fileUri`. DashScope Qwen uses the native `multimodal-generation` endpoint. TokenRouter capabilities depend on the upstream slug (`google/*`, `qwen/*`, `anthropic/*`, etc.). If the output contains a line that is exactly `---SPLIT---`, Bragi splits it into multiple connected text nodes.

---

## Audio models

| Model | `modelId` | Providers | Mode(s) | Key params |
|-------|-----------|-----------|---------|-----------|
| ElevenLabs TTS v3 | `elevenlabs-tts-v3` | ElevenLabs / fal.ai | tts | 8 English voices, stability/similarity/style/speed; native ElevenLabs supports voice ref cloning |
| MiniMax TTS | `minimax-tts` | MiniMax / fal.ai | tts | 12 ZH+EN voices, speed 0.5–2.0; native MiniMax supports voice ref cloning |
| Grok TTS | `grok-tts` | xAI | tts | 5 voices, 9 language options |
| ElevenLabs Music | `elevenlabs-music` | ElevenLabs / fal.ai | music | `music_length_ms` 3–300s, instrumental toggle |
| MiniMax Music | `minimax-music` | MiniMax / fal.ai | music | instrumental OR with-lyrics (needs upstream text node for lyrics) |
| ElevenLabs SFX v2 | `elevenlabs-sfx` | ElevenLabs / fal.ai | sound-effect | `duration` ∈ {1,3,5,10,20,30}s |

Two audio-node utilities exist in the Obsidian UI, but they are **not MCP `generate` models** today and do not appear in `list_models`:

| Utility | Backing service | Output |
|---------|-----------------|--------|
| Speech-to-Text | fal.ai ElevenLabs Scribe v2 | text node |
| Audio Isolation | fal.ai ElevenLabs audio isolation | cleaned audio file |

---

## How mode selection works in `generate`

- If you pass no `mode`, Bragi picks `model.modes[0]`.
- For video with reference images, the UI picks a smart default (1 img → `first-frame`, 2 img → `first-last-frame`, 3+ → `image-ref`). The MCP does **not** infer this for you — explicitly pass `mode` when you want something specific.
- Unsupported modes throw an error from the provider, not from MCP. If a model doesn't list a mode in `list_models({ type: "video" })[i].modes`, don't pass it.

---

## Provider key + connection → model availability

The user has to configure at least one provider key and connect that provider to the model in Bragi settings. Absent key or no connected provider-model pair → model is hidden from `list_models`. Common pairings:

- OpenAI key → GPT Image 2, GPT-5.5, GPT-5.5 Pro
- Gemini key → Nano Banana Pro/2, Veo 3.1 (+Lite), Gemini 3.x text including Gemini 3.5 Flash
- Anthropic key OR AWS Bedrock → Claude 4.x text
- Volcengine (ARK) key → Seedream / Seedance native
- BytePlus key → Seedance on international endpoint (+ Asset library for face refs)
- Token360 key → Seedance 2.0 / 2.0 Fast via `https://api.token360.ai/v1` (+ optional Asset group ID for RealFace / Virtual Portrait image refs)
- Kling AK+SK → Kling 2.6 / 3.0 native
- fal.ai key → fal-ai/* variants of almost everything (universal fallback)
- TokenRouter key → selected text/image/video models via `https://api.tokenrouter.com/v1` (+ optional ModelArk Asset group ID for Seedance `asset://...` refs)
- MuleRouter key → Wan 2.7 Spicy I2V
- DashScope key → Qwen Voice audio + Qwen 3.6 Plus text (native multimodal)
- xAI key → Grok text/image/video/TTS
- APIMart key → GPT Image 2, GPT-5.5, GPT-5.5 Pro, Omni-Flash-Ext
- Luma key → Luma Uni-1 image generation
- MiniMax key → native TTS/Music and voice ref cloning
- ElevenLabs key → native TTS/Music/SFX and voice ref cloning (TTS returns binary mp3)
- Legnext key → Midjourney v8 / niji 7
