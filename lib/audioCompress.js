"use client";
// 브라우저에서 큰 오디오를 미리 압축(모노 16kHz 32kbps mp3) → 업로드 크기·시간 대폭 감소.
// ffmpeg.wasm 단일스레드 코어를 CDN에서 지연 로드(초기 번들에 안 실림). COOP/COEP 불필요.
// 실패하면 throw → 호출측이 원본 업로드로 폴백(백엔드 한도 상향돼서 원본도 올라감).

let _ffPromise = null;

async function getFF() {
  if (_ffPromise) return _ffPromise;
  _ffPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ff = new FFmpeg();
    const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ff;
  })().catch((e) => { _ffPromise = null; throw e; });
  return _ffPromise;
}

// file(File) → 압축된 mp3 File. onProgress(0~99) 콜백 선택.
export async function compressAudio(file, onProgress) {
  const ff = await getFF();
  const { fetchFile } = await import("@ffmpeg/util");
  const handler = ({ progress }) => { if (onProgress) onProgress(Math.max(0, Math.min(99, Math.round((progress || 0) * 100)))); };
  ff.on("progress", handler);
  const ext = (/\.[a-z0-9]+$/i.exec(file.name)?.[0] || ".m4a").toLowerCase();
  const inName = `in${ext}`;
  const outName = "out.mp3";
  try {
    await ff.writeFile(inName, await fetchFile(file));
    await ff.exec(["-i", inName, "-ac", "1", "-ar", "16000", "-b:a", "32k", outName]);
    const data = await ff.readFile(outName);
    const outName2 = file.name.replace(/\.[^.]+$/, "") + ".mp3";
    return new File([data], outName2, { type: "audio/mpeg" });
  } finally {
    ff.off("progress", handler);
    try { await ff.deleteFile(inName); } catch {}
    try { await ff.deleteFile(outName); } catch {}
  }
}
