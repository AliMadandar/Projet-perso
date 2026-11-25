import { $, esc, input, dialog, onForm, button } from './ui.js';

export function photosPaper(photos = []) {
  if (!photos.length) return '';
  return '<section class="annex"><h3>Photos du chantier</h3>' + photos.map(photo =>
    '<figure><img alt="' + esc(photo.caption || 'Vue du chantier') + '" src="data:image/jpeg;base64,' +
    esc(photo.jpeg) + '"><figcaption>' + esc(photo.caption) + '</figcaption></figure>'
  ).join('') + '</section>';
}

async function reducedImage(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15000000) {
    throw Error('Choisissez un fichier JPEG, PNG ou WebP de moins de 15 Mo.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.78, .60, .42, .25]) {
      const jpeg = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      if (jpeg.length <= 320000) return jpeg;
    }
    throw Error('Cette photo reste trop volumineuse. Recadrez-la puis réessayez.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function photoDialog(current, apply) {
  const photos = current.map(p => ({...p}));
  function draw() {
    dialog('Photos visibles par le client', photos.map((p, i) =>
      '<div class="member"><div><img class="thumb" alt="" src="data:image/jpeg;base64,' + esc(p.jpeg) +
      '"><b>' + esc(p.caption || 'Photo '+(i+1)) + '</b></div>' + button('remove-'+i,'Retirer','trash')+'</div>'
    ).join('') + (photos.length < 4 ? '<form id="photoForm"><label>Photo du chantier<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required></label>' +
      input('Légende','caption','','text','maxlength="160"')+'<button>Ajouter la photo</button></form>' : '') +
      button('applyPhotos','Appliquer au devis','check','primary wide'));
    $('#modal').querySelectorAll('[data-act^="remove-"]').forEach(b => b.onclick=()=>{photos.splice(Number(b.dataset.act.slice(7)),1);draw();});
    if ($('#photoForm')) onForm('#photoForm',async o=>{
      const jpeg=await reducedImage(o.image);
      if(!$('#modal').open || !$('#photoForm')) return;
      photos.push({jpeg,caption:o.caption});draw();
    });
    $('[data-act="applyPhotos"]').onclick=()=>{$('#modal').close();apply(photos);};
  }
  draw();
}
