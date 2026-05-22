# Bragi Canvas — model catalogue

This is a snapshot of the hardcoded model catalogue (`plugin/src/models/`). The authoritative list for a given session is whatever `list_models` returns — it filters by which provider keys the user has configured. Use this doc only to *understand* each model's purpose and typical params.

Model IDs below are exact strings to pass as `modelId` in `generate`.

---

## Image models

| Model | `modelId` | Providers | Modes | Key params |
|-------|-----------|-----------|-------|-----------|
| GPT Image 2 | `gpt-image-2` | OpenAI / fal.ai / TokenRouter / APIMart | text-to-image | `aspectRatio` (10), `imageSize` (Auto/1K/2K/4K), `quality` (Auto/Low/Medium/High) |
| Nano Banana Pro | `nano-banana-pro` | Gemini / fal.ai / TokenRouter | text-to-image | `aspectRatio` (10), `imageSize` (1K/2K/4K) |
| Nano Banana 2 | `nano-banana-2` | Gemini / fal.ai / TokenRouter | text-to-image | `aspectRatio` (14), `imageSize` (512/1K/2K/4K) |
| Grok Imagine | `grok-imagine` | xAI / fal.ai | text-to-image, image-ref-to-image | `aspectRatio` (9), `quality` |
| Midjourney v8 | `midjourney-v8` | Legnext | text-to-image | `ar` (10), `quality`, `stylize` (0–1000) |
| Midjourney niji 7 | `midjourney-niji-7` | Legnext | text-to-image | `ar` (7), `stylize` |
| Luma Uni-1 | `luma-uni-1` | Luma | text-to-image, image-ref-to-image | `aspectRatio` (5) |
| Seedream 5.0 | `seedream-5.0` | Volcengine | text-to-image | `aspectRatio` (8), `resolution` (2K/3K) |
| Seedream 4.5 | `seedream-4.5` | Volcengine / TokenRouter | text-to-image | `aspectRatio` (8), `resolution` (2K/4K) |

---

## Video models

| Model | `modelId` | Providers | Modes | Key params |
|-------|-----------|-----------|-------|-----------|
| Seedance 2.0 | `seedance-2.0` | Volcengine / BytePlus / fal.ai / TokenRouter | text-to-video, first-frame, image-ref, video-ref | `duration` (Auto/4–15s), `ratio` (5), `resolution` (480p/720p/1080p), `generate_audio` |
| Seedance 2.0 Fast | `seedance-2.0-fast` | Volcengine / BytePlus / TokenRouter | same as above | `duration`, `ratio` (3), `resolution` (480p/720p), `generate_audio` |
| Kling 3.0 | `kling-3.0` | Kling / fal.ai / TokenRouter | text-to-video, first-frame, first-last-frame | `duration` (5/10s), `aspect_ratio`, `mode` (std/pro) |
| Kling 2.6 | `kling-2.6` | Kling / TokenRouter | same as 3.0 | same |
| HappyHorse 1.0 T2V | `happyhorse-1.0-t2v` | TokenRouter | text-to-video | provider defaults |
| HappyHorse 1.0 I2V | `happyhorse-1.0-i2v` | TokenRouter | first-frame | requires one upstream image |
| Veo 3.1 | `veo-3.1` | Gemini / fal.ai | text-to-video, first-frame, first-last-frame, image-ref (≤3) | `durationSeconds` (4/6/8s), `aspectRatio` (16:9/9:16), `resolution` (720p/1080p) |
| Veo 3.1 Lite | `veo-3.1-lite` | Gemini | text-to-video, first-frame (no image-ref) | same as 3.1 |
| Grok Video | `grok-video` | xAI / fal.ai | text-to-video, first-frame, image-ref, video-extend | `duration`, `aspect_ratio` (7), `resolution` (480p/720p/1080p) |

**All video generations are async.** `generate` returns `generation_started` and the result lands on the canvas minutes later.

TokenRouter Seedance maps `seedance-2.0` / `seedance-2.0-fast` to Dreamina model IDs and accepts reference images, audio, and videos as URL arrays. Asset IDs (`asset://...`) are only passed through for native Volcengine / BytePlus Seedance.

---

## Text models

| Model | `modelId` | Providers | Vision input |
|-------|-----------|-----------|--------------|
| Claude Opus 4.7 | `claude-opus-4-7` | Anthropic / AWS Bedrock / TokenRouter | yes |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Anthropic / Bedrock / TokenRouter | yes |
| Gemini 3 Flash | `gemini-3-flash` | Gemini / TokenRouter | yes |
| Gemini 3.1 Pro | `gemini-3.1-pro` | Gemini / TokenRouter | yes |
| Grok 4.3 | `grok-4-3` | xAI / TokenRouter | yes |
| Grok 4 Fast | `grok-4-fast` | xAI / TokenRouter | yes |
| Qwen 3.6 Plus | `qwen-3-6-plus` | TokenRouter | no |
| GPT-5.5 Pro | `gpt-5.5-pro` | OpenAI / TokenRouter / APIMart | yes |
| GPT-5.5 | `gpt-5.5` | OpenAI / TokenRouter / APIMart | yes |

Text model output is a text node. `Vision input` means upstream image nodes can be passed to that text model; APIMart GPT-5.5 uses the multimodal Responses API for image refs. Video, audio, and PDF refs remain provider-specific and are not implied by this column. If the output contains a line that is exactly `---SPLIT---`, Bragi splits it into multiple connected text nodes — useful for batched shot lists, scene beats, etc.

---

## Audio models

| Model | `modelId` | Providers | Mode(s) | Key params |
|-------|-----------|-----------|---------|-----------|
| ElevenLabs TTS v3 | `elevenlabs-tts-v3` | ElevenLabs / fal.ai | tts | 8 English voices |
| MiniMax TTS | `minimax-tts` | MiniMax / fal.ai | tts | 12 ZH+EN voices, speed 0.5–2.0 |
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

## Provider key → model availability

The user has to configure at least one key per model. Absent key → model is hidden from `list_models`. Common pairings:

- OpenAI key → GPT Image 2, GPT-5.5, GPT-5.5 Pro
- Gemini key → Nano Banana Pro/2, Veo 3.1 (+Lite), Gemini 3.x text
- Anthropic key OR AWS Bedrock → Claude 4.x text
- Volcengine (ARK) key → Seedream / Seedance native
- BytePlus key → Seedance on international endpoint (+ Asset library for face refs)
- Kling AK+SK → Kling 2.6 / 3.0 native
- fal.ai key → fal-ai/* variants of almost everything (universal fallback)
- TokenRouter key → selected text/image/video models via `https://api.tokenrouter.com/v1`
- xAI key → Grok text/image/video/TTS
- APIMart key → GPT Image 2, GPT-5.5, GPT-5.5 Pro
- Luma key → Luma Uni-1 image generation
- MiniMax key → native TTS/Music
- ElevenLabs key → native TTS/Music/SFX (returns binary mp3)
- Legnext key → Midjourney v8 / niji 7
