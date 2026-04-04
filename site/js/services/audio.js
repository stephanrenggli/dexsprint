import { criesLegacyBase, criesLatestBase } from "../core/app-config.js";

export async function playCry(canonical, {
  state,
  criesToggle,
  legacyCriesToggle
}) {
  if (!canonical) return;
  const entry = state.meta.get(canonical);
  if (!entry || !entry.cryId) return;
  if (criesToggle && !criesToggle.checked) return;
  try {
    if (!state.cryAudio) {
      state.cryAudio = new Audio();
      state.cryAudio.preload = "auto";
    }
    state.cryAudio.pause();
    const useLegacy = legacyCriesToggle && legacyCriesToggle.checked;
    const legacyUrl = `${criesLegacyBase}${entry.cryId}.ogg`;
    const modernUrl = `${criesLatestBase}${entry.cryId}.ogg`;
    state.cryAudio.volume = 0.1;
    if (useLegacy) {
      await playCryWithFallback(state, legacyUrl, modernUrl);
      return;
    }
    state.cryAudio.src = modernUrl;
    await state.cryAudio.play();
  } catch (err) {
    // no-op: audio is optional
  }
}

export async function playCryWithFallback(state, legacyUrl, modernUrl) {
  if (!state.cryAudio) return;
  return new Promise((resolve, reject) => {
    const audio = state.cryAudio;
    let settled = false;

    const cleanup = () => {
      audio.removeEventListener("error", onLegacyError);
      audio.removeEventListener("playing", onPlaying);
    };

    const onPlaying = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onLegacyError = () => {
      audio.removeEventListener("error", onLegacyError);
      audio.src = modernUrl;
      audio
        .play()
        .then(() => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(err);
        });
    };

    audio.addEventListener("playing", onPlaying, { once: true });
    audio.addEventListener("error", onLegacyError, { once: true });
    audio.src = legacyUrl;
    audio.play().catch(() => {
      // If play fails due to autoplay restrictions, don't force fallback.
    });
  });
}
