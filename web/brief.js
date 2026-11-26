import { $, esc, button, dialog, input, toast, api } from './ui.js';
import { startRecording, wavBase64 } from './voice.js';
import { euros } from './money.js';
export function brief(state, apply, initialMessage = '') {
  const history = [];
  let proposal = {
      questions: [],
      lines: []
    },
    busy = false,
    active = true,
    blob = null,
    stop = null,
    recording = false,
    message = initialMessage,
    feedback = '',
    playUrl = '';
  const modal = $('#modal');
  modal.addEventListener('close', () => {
    active = false;
    stop?.(true);
    if (playUrl) URL.revokeObjectURL(playUrl);
  }, {
    once: true
  });
  function show() {
    if (!active) return;
    dialog('Assistant chantier', '<p>Écrivez ou dictez les pièces, les surfaces et les travaux. Relisez les lignes avant de les ajouter au devis.</p>' +
      proposal.questions.map(q => '<p class="hint">' + esc(q) + '</p>').join('') +
      '<label>Votre demande ou votre réponse<textarea id="briefText" rows="3" maxlength="8000"' + (busy ? ' disabled' : '') + '>' + esc(message) + '</textarea></label>' +
      '<div class="actions">' + button('mic', recording ? 'Terminer' : 'Dicter', 'mic') + (blob || recording ? button('discard', 'Annuler la dictée') : '') +
      button('send', busy ? 'Analyse en cours…' : 'Analyser avec Gemini', 'arrow', 'primary') + '</div>' +
      (feedback ? '<p class="hint" role="status">' + esc(feedback) + '</p>' : '') +
      (blob ? '<audio controls id="briefAudio"></audio>' : '') +
      (proposal.lines.length ? '<form id="proposal"><h3>Proposition à vérifier</h3>' + proposal.lines.map((l, i) => '<label class="agree"><input type="checkbox" name="line" checked value="' + i + '">' + esc([l.lot, l.label, state.tiers[l.tier], l.quantity / 100 + ' ' + l.unit, euros(l.price) + ' HT / ' + l.unit].filter(Boolean).join(' · ')) + '</label>').join('') + input('TVA (%) des lignes retenues', 'tax', 20, 'number', 'min="0" max="100" step=".01" required') + '<button class="wide"' + (busy ? ' disabled' : '') + '>Ajouter la sélection au devis</button></form>' : ''));
    $('#briefText').oninput = e => message = e.target.value;
    const b = a => modal.querySelector('[data-act="' + a + '"]');
    if (playUrl) URL.revokeObjectURL(playUrl);
    if (blob) {
      playUrl = URL.createObjectURL(blob);
      $('#briefAudio').src = playUrl;
    }
    b('mic').disabled = busy;
    b('send').disabled = busy || recording;
    b('mic').onclick = async () => {
      if (recording) return stop?.();
      try {
        b('mic').disabled = true;
        blob = null;
        const end = await startRecording(v => {
          stop = null;
          recording = false;
          blob = v;
          show();
        });
        if (!active) return end(true);
        stop = end;
        recording = true;
        show();
      } catch {
        feedback = 'Micro indisponible. Vous pouvez saisir la demande.';
        show();
      }
    };
    if (b('discard')) {
      b('discard').disabled = busy;
      b('discard').onclick = () => {
        stop?.(true);
        blob = null;
        show();
      };
    }
    b('send').onclick = async () => {
      if (!message.trim() && !blob) return toast('Saisissez ou dictez une demande.');
      busy = true;
      feedback = '';
      show();
      try {
        const p = await api('brief', {
          description: message,
          audio: blob ? await wavBase64(blob) : undefined,
          history
        });
        history.push({
          demande: message || p.transcription || 'Demande vocale',
          proposition: p
        });
        proposal = p;
        message = '';
        blob = null;
      } catch (e) {
        feedback = e.message;
      } finally {
        busy = false;
        show();
      }
    };
    if ($('#proposal')) $('#proposal').onsubmit = e => {
      e.preventDefault();
      const data = new FormData(e.target);
      const lines = data.getAll('line').map(i => ({
        ...proposal.lines[i],
        tax: Math.round(Number(data.get('tax')) * 100)
      }));
      if (!lines.length) return toast('Sélectionnez au moins une ligne.');
      modal.close();
      apply(lines);
    };
  }
  show();
}
