// Normalise le format du navigateur en PCM mono 16 kHz pour l’API.
export async function wavBase64(blob) {
  const context = new AudioContext();
  let source;
  try {
    source = await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    await context.close();
  }
  const render = new OfflineAudioContext(1, Math.ceil(source.duration * 16000), 16000);
  const player = render.createBufferSource();
  player.buffer = source;
  player.connect(render.destination);
  player.start();
  const pcm = (await render.startRendering()).getChannelData(0);
  const out = new ArrayBuffer(44 + pcm.length * 2),
    view = new DataView(out);
  function tag(offset, s) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  }
  tag(0, 'RIFF');
  view.setUint32(4, out.byteLength - 8, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((n, i) => view.setInt16(44 + 2 * i, Math.round(Math.max(-1, Math.min(1, n)) * 32767), true));
  const bytes = new Uint8Array(out);
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export async function startRecording(done) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true
  });
  try {
    const recorder = new MediaRecorder(stream),
      chunks = [];
    let discard = false;
    recorder.ondataavailable = e => chunks.push(e.data);
    const stop = (cancel = false) => {
      discard = cancel;
      if (recorder.state === 'recording') recorder.stop();
    };
    const timer = setTimeout(() => stop(), 120000);
    recorder.onstop = () => {
      clearTimeout(timer);
      stream.getTracks().forEach(t => t.stop());
      done(discard ? null : new Blob(chunks, {
        type: recorder.mimeType
      }));
    };
    recorder.start();
    return stop;
  } catch (e) {
    stream.getTracks().forEach(t => t.stop());
    throw e;
  }
}
