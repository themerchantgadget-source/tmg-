export function createWarmChordWavBlob(durationSeconds = 5): Blob {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const freqs = [220, 277.18, 329.63, 415.3];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t / 0.35);
    const fadeOut = Math.min(1, Math.max(0, (durationSeconds - t) / 0.5));
    const envelope = fadeIn * fadeOut;
    let sample = 0;
    for (let k = 0; k < freqs.length; k++) {
      sample += Math.sin(2 * Math.PI * freqs[k] * t) * (0.22 / (k * 0.4 + 1));
    }
    const pcm = Math.max(-1, Math.min(1, sample * envelope * 0.65));
    view.setInt16(44 + i * 2, Math.floor(pcm * 32767), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function createSamplePosterSvgBlob(): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#F2F1ED"/>
  <rect x="64" y="64" width="672" height="472" rx="24" fill="#FFFFFF" stroke="#DFDCD4" stroke-width="2"/>
  <circle cx="240" cy="280" r="92" fill="#D94E32" opacity="0.9"/>
  <circle cx="340" cy="280" r="92" fill="#181816" opacity="0.88"/>
  <text x="148" y="450" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#161614">tmg Studio Study 01</text>
  <text x="148" y="484" font-family="monospace" font-size="15" fill="#5F5C54">Warm stone · Clay · Charcoal</text>
</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}
