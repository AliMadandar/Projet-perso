import {esc} from './ui.js';
export function inkMarkup(ink){
 if(!ink?.length)return '';
 return '<svg viewBox="0 0 480 128" class="signature-ink" aria-label="Tracé du signataire" role="img">'+ink.map(points=>'<polyline fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="'+points.map(p=>p.map(Number).join(',')).join(' ')+'"/>').join('')+'</svg>';
}
export function signatureProof(s){
 return s?'<section class="signed-proof">'+inkMarkup(s.ink)+'<strong>Signé électroniquement · '+esc(s.name)+'</strong><p>'+esc(s.consent)+'</p><small>'+esc(new Date(s.at).toLocaleString('fr-FR',{timeZone:'Europe/Paris'}))+' (Paris) · '+esc(s.number)+' · version '+esc(s.version)+'</small><small>Empreinte SHA-256 du devis signé<br>'+esc(s.digest)+'</small></section>':'';
}
