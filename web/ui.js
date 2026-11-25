export const $ = s => document.querySelector(s);
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
export const paths = {
  home: 'M3 10l9-7 9 7v10h-6v-6H9v6H3z',
  doc: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5',
  users: 'M15 20v-2a5 5 0 0 0-10 0v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 5a3 3 0 0 1 0 6 M18 14c2 0 3 2 3 5',
  book: 'M4 5h7l1 2 1-2h7v14h-7l-1 2-1-2H4z M12 7v13',
  gear: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  bell: 'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4z M10 20h4',
  plus: 'M12 5v14 M5 12h14',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  back: 'M19 12H5l5-5 M5 12l5 5',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z M5 11a7 7 0 0 0 14 0 M12 18v4 M9 22h6',
  logout: 'M9 4H4v16h5 M9 12h12l-4-4 M21 12l-4 4',
  print: 'M7 8V3h10v5 M7 17H3V9h18v8h-4 M7 14h10v7H7z',
  copy: 'M8 8h12v13H8z M5 16H3V3h12v2',
  trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  check: 'M4 12l5 5L20 6',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  edit: 'M4 20l5-1L20 8l-4-4L5 15z',
  download: 'M12 3v12l5-5 M12 15l-5-5 M4 16v5h16v-5',
  x: 'M5 5l14 14 M19 5L5 19'
};
export const icon = k => '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + paths[k] + '"/></svg>';
export const button = (action, label, k = '', cls = '') => '<button type="button" class="' + cls + '" data-act="' + esc(action) + '">' + (k ? icon(k) : '') + esc(label) + '</button>';
export const input = (label, name, value = '', type = 'text', attr = '') => '<label>' + esc(label) + '<input name="' + esc(name) + '" type="' + type + '" value="' + esc(value) + '" ' + attr + '></label>';
export const area = (label, name, value = '') => '<label>' + esc(label) + '<textarea name="' + name + '" rows="3">' + esc(value) + '</textarea></label>';
export const options = (arr, value) => arr.map(([v, l]) => '<option value="' + esc(v) + '" ' + (String(v) === String(value) ? 'selected' : '') + '>' + esc(l) + '</option>').join('');
export const select = (label, name, opts, value) => '<label>' + esc(label) + '<select name="' + name + '">' + options(opts, value) + '</select></label>';
export const dateLabel = d => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium'
}).format(new Date(d.length === 10 ? d + 'T12:00:00' : d));
export const today = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
export const status = s => '<span class="badge b' + ({
  'Accepté': 1,
  'Validé': 1,
  'Envoyé': 2,
  'Refusé': 3,
  'Brouillon': 4
}[s] || 0) + '">' + esc(s) + '</span>';
let timer;
export function toast(msg) {
  const modal = document.querySelector('dialog[open]');
  if (modal) {
    let note = modal.querySelector('[role="status"]');
    if (!note) {
      note = document.createElement('p');
      note.className = 'hint';
      note.setAttribute('role', 'status');
      modal.prepend(note);
    }
    note.textContent = msg;
    note.scrollIntoView({
      block: 'nearest'
    });
  }
  $('#toast').textContent = msg;
  $('#toast').classList.add('on');
  clearTimeout(timer);
  timer = setTimeout(() => $('#toast').classList.remove('on'), 5000);
}
export async function api(path, body, method = body ? 'POST' : 'GET') {
  const r = await fetch('/api/' + path, {
    method,
    headers: body ? {
      'Content-Type': 'application/json'
    } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const v = await r.json();
  if (!r.ok) {
    if (r.status === 401 && path !== 'login') window.dispatchEvent(new Event('sessionexpired'));
    throw Error(v.error || 'Erreur réseau.');
  }
  return v;
}
export function dialog(title, html) {
  const d = $('#modal');
  d.querySelector(':scope > [role=status]')?.remove();
  $('#modalContent').innerHTML = '<header><h2>' + esc(title) + '</h2>' + button('close', 'Fermer', 'x', 'subtle') + '</header>' + html;
  d.setAttribute('aria-label', title);
  if (!d.open) d.showModal();
  d.querySelector('[data-act="close"]').onclick = () => d.close();
}
export function onForm(id, fn) {
  $(id).onsubmit = async e => {
    e.preventDefault();
    const b = e.submitter;
    if (b) b.disabled = true;
    try {
      await fn(Object.fromEntries(new FormData(e.target)), e.target);
    } catch (err) {
      toast(err.message);
    } finally {
      if (b) b.disabled = false;
    }
  };
}
export function csv(name, rows) {
  const cell = v => {
    let t = String(v ?? '');
    if (/^[=+@\-\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replaceAll('"', '""') + '"';
  };
  const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(cell).join(';')).join('\r\n')], {
    type: 'text/csv;charset=utf-8'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
