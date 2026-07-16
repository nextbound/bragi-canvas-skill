# Bragi Canvas — model catalogue

This is a snapshot of the hardcoded model catalogue (`plugin/src/models/`). The authoritative list for a given session is whatever `list_models` returns — it filters by which provider keys the user has configured and which provider-model pairs are connected in settings. Use this doc only to *understand* each model's purpose and typical params.

Model IDs below are exact strings to pass as `modelId` in `generate`.

---

## Image models

| Model | `modelId` | Providers | Modes | Key params |
|-------|-----------|-----------|-------|-----------|
| GPT Image 2 | `gpt-image-2` | OpenAI / fal.ai / TokenRouter / APIMart / SVRouter | text-to-image | `aspectRatio` (15 + Auto), `imageSize` (Auto/1K/2K/4K), `quality` (Auto/Low/Medium/High) |
| GPT Image 2 (Official) | `gpt-image-2-official` | APIMart / SVRouter | text-to-image | same controls as GPT Image 2; the official channel honors `quality` |
| Nano Banana Pro | `nano-banana-pro` | Gemini / fal.ai / TokenRouter / APIMart / SVRouter | text-to-image | `aspectRatio` (10), `imageSize` (1K/2K/4K) |
| Nano Banana 2 | `nano-banana-2` | Gemini / fal.ai / TokenRouter / APIMart | text-to-image | `aspectRatio` (14), `imageSize` (512/1K/2K/4K) |
| Grok Imagine | `grok-imagine` | xAI / fal.ai | text-to-image, image-ref-to-image | `aspectRatio` (9), `quality` |
| Midjourney v8 | `midjourney-v8` | Legnext | text-to-image | `ar` (10), `quality`, `stylize` (0–1000) |
| Midjourney niji 7 | `midjourney-niji-7` | Legnext | text-to-image | `ar` (7), `stylize` |
| Luma Uni-1 | `luma-uni-1` | Luma | text-to-image, image-ref-to-image | `aspectRatio` (5) |
| FLUX.2 Klein 9B | `flux-2-klein-9b` | BFL / Runpod / fal.ai | text-to-image, image-ref-to-image | `aspectRatio` (9), `targetLongEdge` (1K/2K/3K; Runpod/fal max 2K), provider denoise defaults |
| Seedream 5.0 | `seedream-5.0` | Volcengine | text-to-image | `aspectRatio` (8), `resolution` (2K/3K) |
| Seedream 5.0 Lite | `seedream-5.0-lite` | Volcengine / BytePlus / SVRouter | text-to-image | `aspectRatio` (8), `resolution` (2K/3K/4K) |
| Seedream 4.5 | `seedream-4.5` | Volcengine / TokenRouter | text-to-image | `aspectRatio` (8), `resolution` (2K/4K) |
| Z-Image Spicy | `z-image-spicy` | MuleRouter | text-to-image | `aspectRatio` (1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9), `prompt_extend` |
| Qwen Image Edit Spicy | `qwen-image-edit-spicy` | MuleRouter | image-ref-to-image | requires one upstream image |

GPT Image 2's OpenAI and OpenAI-compatible image routes convert `imageSize` + `aspectRatio` into a concrete pixel `size`; APIMart and SVRouter's GPT Image 2 family send the selected aspect ratio as `size` and the same tier as `resolution`. APIMart's stable `gpt-image-2` Bragi model ID routes to the official upstream model ID so `quality` is honored. `gpt-image-2-official` remains a separate Bragi model for explicitly selecting the APIMart/SVRouter official channel; the non-official SV gateway route deliberately does not forward the OpenAI `quality` enum. SVRouter Nano Banana Pro also uses the APIMart-style `size` + `resolution` payload shape.

FLUX.2 Klein 9B supports text-to-image and single reference image generation through BFL, Runpod, or fal.ai. BFL accepts up to 3K long edge; Runpod and fal.ai are capped at 2K. Bragi applies the provider's denoise-oriented defaults and optional color matching when reference images are used.

When GPT Image 2 uses TokenRouter with upstream image refs, Bragi keeps those image refs inline and uploads them as multipart files to `/v1/images/edits`; TokenRouter ModelArk Asset IDs are only for Seedance refs.

MuleRouter Z-Image Spicy maps the selected `aspectRatio` to fixed dimensions inside MuleRouter's 256–1536 px range, then submits an async CarrotHub image task internally. Qwen Image Edit Spicy uses only the first ordered upstream image. Bragi waits for completion and writes the returned image URL to the canvas.

---

## Video models

| Model | `modelId` | Providers | Modes | Key params |
|-------|-----------|-----------|-------|-----------|
| Seedance 2.0 | `seedance-2.0` | Volcengine / BytePlus / fal.ai / TokenRouter / Token360 / SVRouter | text-to-video, first-frame, image-ref, video-ref | `duration` (Auto/4–15s), `ratio` (5), `resolution` (480p/720p/1080p), `generate_audio` |
| Seedance 2.0 Fast | `seedance-2.0-fast` | Volcengine / BytePlus / TokenRouter / Token360 | same as above | `duration`, `ratio` (3), `resolution` (480p/720p), `generate_audio` |
| Kling 3.0 | `kling-3.0` | Kling / APIMart / fal.ai / TokenRouter / SVRouter | provider-dependent | `duration` (5/10s), `aspect_ratio`, `mode` (std/pro); APIMart is Motion Control only |
| Kling 3.0 Omni | `kling-3.0-omni` | Kling / APIMart | text-to-video, first-frame, first-last-frame, image-ref, video-ref, video-edit | `duration` (3–15s), `aspect_ratio`, `mode` (std/pro/4k), `multi_shot` (default true), mode-specific audio control |
| Kling 2.6 | `kling-2.6` | Kling / TokenRouter | same as 3.0 | same |
| HappyHorse 1.0 T2V | `happyhorse-1.0-t2v` | TokenRouter | text-to-video | provider defaults |
| HappyHorse 1.0 I2V | `happyhorse-1.0-i2v` | TokenRouter | first-frame | requires one upstream image |
| Wan 2.7 | `wan-2.7` | DashScope / MuleRouter | provider-dependent (see note) | DashScope: `resolution` (720P/1080P), `ratio`, `duration` (2–15s), `prompt_extend`, `audio_setting` (video-edit only). MuleRouter: `resolution` (720p/1080p), `duration`, `prompt_extend` (no `ratio`) |
| Veo 3.1 | `veo-3.1` | Gemini / fal.ai / SVRouter | provider-dependent; Gemini/fal include text-to-video, first-frame, first-last-frame, image-ref (≤3); SVRouter exposes text-to-video + first-frame | `durationSeconds` (4/6/8s), `aspectRatio` (16:9/9:16), `resolution` (720p/1080p) |
| Veo 3.1 Lite | `veo-3.1-lite` | Gemini | text-to-video, first-frame (no image-ref) | same as 3.1 |
| Grok Video | `grok-video` | xAI / fal.ai / SVRouter | text-to-video, first-frame, image-ref, video-extend | `duration`, `aspect_ratio` (7), `resolution` (480p/720p/1080p) |
| Omni-Flash-Ext | `omni-flash-ext` | APIMart / SuChuang | text-to-video, first-frame, multi-image-ref, video-ref | `duration` (4/6/8/10s), `resolution` (720p/1080p/4k), `aspect_ratio` (16:9/9:16) |

**All video generations are async.** `generate` returns `generation_started` and the result lands on the canvas minutes later.

TokenRouter Seedance maps `seedance-2.0` / `seedance-2.0-fast` to Dreamina model IDs and accepts reference images, audio, and videos. When both a TokenRouter key and TokenRouter Asset group ID are configured, Bragi routes reference images/audio/videos through that explicit ModelArk group and passes them as `asset://...`; without a group ID, local refs use temporary HTTPS URLs. BytePlus and Volcengine keep their own provider-scoped asset IDs.

Token360 Seedance uses the official `seedance-2.0` / `seedance-2.0-fast` model IDs through `https://api.token360.ai/v1`. Without a Token360 Asset group ID, Bragi uploads local reference media to temporary HTTPS URLs. With an Asset group ID configured, Token360 image refs are uploaded as RealFace / Virtual Portrait assets, cached on the source node, and sent as `asset://ta_...`; audio and video refs still use HTTPS URLs.

Wan 2.7 is a single model (`wan-2.7`) with two providers whose modes differ — always read the modes from the model's `list_models` entry for the active provider:

- **DashScope** is aggregated: one `wan-2.7` id routes internally to the t2v / i2v / r2v / video-edit upstream models. It offers all modes: `text-to-video`, `first-frame`, `first-last-frame`, `image-ref`, `video-ref`, `video-extend`, and `video-edit`. The API model id is not editable.
- **MuleRouter** offers only `first-frame` (the spicy I2V variant): it requires one upstream image, can use the first upstream audio, uses lowercase `resolution` values, and has no `ratio` param. Pass `modelId: "wan-2.7"` with `mode: "first-frame"`.

Bragi uploads local image/audio refs to temporary HTTPS URLs before calling either provider. The old `wan-2.7-i2v-spicy` model id no longer exists; saved settings are migrated to `wan-2.7`.

SVRouter video models use stable `sv-*` gateway ids. Seedance receives refs as top-level `images` / `audios` / `videos` plus `metadata` for ratio, duration, resolution, and `generate_audio`; Auto duration is forwarded as `metadata.duration = -1`, matching direct Ark Seedance behavior. Fal-routed SVRouter models such as Kling, Grok, and Veo receive top-level `images` plus the provider-effective media params.

APIMart Omni-Flash-Ext accepts 0, 1, or 3 reference images and at most 1 reference video. Bragi re-uploads every APIMart image/video reference through the temporary Bragi Relay before sending `image_urls` / `video_urls`; APIMart never receives data URIs or third-party source URLs. When using `video-ref`, Bragi omits `duration` because APIMart derives timing from the reference video.

Kling 3.0 Omni uses the native Kling `/v1/videos/omni-video` endpoint or APIMart's `/v1/videos/generations` endpoint with the same upstream model ID, `kling-v3-omni`. Ordered upstream images map to first/last frame roles in `first-frame` and `first-last-frame`; `image-ref` sends up to 7 reference images and automatically adds missing `<<<image_N>>>` prompt references. `video-ref` sends one feature reference video. `video-edit` sends one base video, may also include ordinary reference images, adds any missing `<<<image_N>>>` references, and follows the base video's duration. Native Kling accepts up to 4 reference images when a video is present; APIMart sends video-edit references through `image_urls`. Connected media is uploaded to temporary HTTPS URLs. The generator bar exposes intelligent multi-shot as `Multi shots` by default, with `Single shot` as the alternative; generated audio is labeled `Audio On` / `Audio Off`. Advanced provider calls may also pass custom `multi_prompt` shot lists and subject-list payloads.

SuChuang Omni-Flash-Ext uses the provider's `google_omni` endpoint. It accepts text plus up to 7 reference images, sent as temporary Bragi Relay URLs in the comma-separated `images` field. SuChuang does not support reference videos on this endpoint and only supports 720p/1080p sizes; choose APIMart when you need `video-ref` or `4k`.

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
| GPT-5.5 | `gpt-5.5` | OpenAI / TokenRouter / APIMart / SVRouter | image + PDF |

Text model output is a text node. Bragi validates upstream media against a model × provider capability matrix before calling the provider. OpenAI, xAI, and APIMart GPT models use the Responses API for image/PDF refs. Anthropic and Bedrock send PDFs as `document` blocks (≤32 MB). Gemini keeps small images inline and uploads large or non-image refs through Bragi Relay as `fileData.fileUri`. DashScope Qwen uses the native `multimodal-generation` endpoint. TokenRouter capabilities depend on the upstream slug (`google/*`, `qwen/*`, `anthropic/*`, etc.). If the output contains a line that is exactly `---SPLIT---`, Bragi splits it into multiple connected text nodes.

---

## Audio models

| Model | `modelId` | Providers | Mode(s) | Key params |
|-------|-----------|-----------|---------|-----------|
| ElevenLabs TTS v3 | `elevenlabs-tts-v3` | ElevenLabs / fal.ai / SVRouter | tts | 8 English voices, stability/similarity/style/speed; native ElevenLabs supports voice ref cloning |
| MiniMax TTS | `minimax-tts` | MiniMax / fal.ai / SVRouter | tts | 12 ZH+EN voices, speed 0.5–2.0; native MiniMax supports voice ref cloning |
| Grok TTS | `grok-tts` | xAI | tts | 5 voices, 9 language options |
| ElevenLabs Music | `elevenlabs-music` | ElevenLabs / fal.ai | music | `music_length_ms` 3–300s, instrumental toggle |
| MiniMax Music | `minimax-music` | MiniMax / fal.ai | music | instrumental OR with-lyrics (needs upstream text node for lyrics) |
| ElevenLabs SFX v2 | `elevenlabs-sfx` | ElevenLabs / fal.ai / SVRouter | sound-effect | `duration` ∈ {1,3,5,10,20,30}s |

Three audio-node utilities exist in the Obsidian UI, but they are **not MCP `generate` models** today and do not appear in `list_models`:

| Utility | Backing service | Output |
|---------|-----------------|--------|
| Voice Changer | Native ElevenLabs `eleven_multilingual_sts_v2` | converted audio file |
| Speech-to-Text | fal.ai ElevenLabs Scribe v2 | text node |
| Audio Isolation | fal.ai ElevenLabs audio isolation | cleaned audio file |

---

## How mode selection works in `generate`

- The catalogue is **provider-scoped**: `list_models` returns, for each model, only the modes and params of its *active* provider. A provider may expose a subset of a model's modes (e.g. MuleRouter `wan-2.7` is `first-frame` only). Never pass a mode or param taken from this doc or from another provider — use the model's `list_models` entry as the source of truth.
- If you pass no `mode`, Bragi picks the **first mode in that `list_models` entry** (the active provider's first mode), not necessarily the catalogue default. For MuleRouter `wan-2.7` that is `first-frame`, not `text-to-video`.
- For video with reference images, the UI picks a smart default (1 img → `first-frame`, 2 img → `first-last-frame`, 3+ → `image-ref`). The MCP does **not** infer this for you — explicitly pass `mode` when you want something specific.
- Unsupported modes are rejected by MCP `generate` **before** the provider is called, with an error like `Mode "<mode>" is not supported by <provider> for <modelId>. Supported modes: …`. If a mode isn't in the `list_models` entry, don't pass it.

### Provider-effective params and reference delivery

`list_models` params are also provider-effective: a provider may narrow a param's options/default/range or hide it entirely (e.g. MuleRouter `wan-2.7` hides `ratio` and uses lowercase resolutions). Aggregated providers route one model id to several upstream ids internally and expose a non-editable API model id. Reference media is delivered per a catalog declaration — relay HTTPS URL, inline data, a provider-native `asset://` id, or passthrough — handled automatically by Bragi; agents always just connect upstream nodes.

---

## Provider key + connection → model availability

The user has to configure at least one provider key and connect that provider to the model in Bragi settings. Absent key or no connected provider-model pair → model is hidden from `list_models`. Common pairings:

- OpenAI key → GPT Image 2, GPT-5.5, GPT-5.5 Pro
- Gemini key → Nano Banana Pro/2, Veo 3.1 (+Lite), Gemini 3.x text including Gemini 3.5 Flash
- Anthropic key OR AWS Bedrock → Claude 4.x text
- Volcengine (ARK) key → Seedream / Seedance native
- BytePlus key → Seedance on international endpoint (+ explicit Asset group ID for face refs) and Seedream 5.0 Lite image generation
- Token360 key → Seedance 2.0 / 2.0 Fast via `https://api.token360.ai/v1` (+ optional Asset group ID for RealFace / Virtual Portrait image refs)
- Kling AK+SK → Kling 2.6 / 3.0 / 3.0 Omni native
- fal.ai key → fal-ai/* variants of almost everything (universal fallback)
- TokenRouter key → selected text/image/video models via `https://api.tokenrouter.com/v1` (+ optional ModelArk Asset group ID for Seedance `asset://...` refs)
- MuleRouter key → Z-Image Spicy, Qwen Image Edit Spicy, Wan 2.7 (`first-frame` only)
- DashScope key (video) → Wan 2.7 (all modes, incl. `video-edit`)
- DashScope key → Qwen Voice audio + Qwen 3.6 Plus text (native multimodal)
- xAI key → Grok text/image/video/TTS
- APIMart key → GPT Image 2, GPT Image 2 (Official), GPT-5.5, GPT-5.5 Pro, Kling 3.0 Omni, Omni-Flash-Ext
- SVRouter key → gateway `sv-*` routes for GPT Image 2 / GPT Image 2 (Official), selected image/video/audio models, and GPT-5.5 text. The stored settings key remains `svnewapi` for compatibility.
- BFL, Runpod, or fal.ai key → FLUX.2 Klein 9B image generation
- SuChuang key → Omni-Flash-Ext via `https://api.wuyinkeji.com`
- Luma key → Luma Uni-1 image generation
- MiniMax key → native TTS/Music and voice ref cloning
- ElevenLabs key → native TTS/Music/SFX and voice ref cloning (TTS returns binary mp3)
- Legnext key → Midjourney v8 / niji 7
