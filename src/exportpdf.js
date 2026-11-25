import {access,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {paper} from '../web/editor.js';
const run=promisify(execFile);
async function browser(){
 const names=[process.env.PDF_BROWSER,...[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(dir=>[join(dir,'Google/Chrome/Application/chrome.exe'),join(dir,'Microsoft/Edge/Application/msedge.exe')]),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
 for(const f of names){try{await access(f);return f;}catch{}}
 throw Error('Chrome ou Edge introuvable pour générer le PDF. Renseignez PDF_BROWSER sur le serveur.');
}
export async function exportPdf(d){
 const executable=await browser(),dir=await mkdtemp(join(tmpdir(),'ma-devis-'));
 try{
   const [css,logo,icon]=await Promise.all(['style.css','ma-logo.png','icon.svg'].map(f=>readFile(new URL('../web/'+f,import.meta.url))));
   const html=paper(d).replaceAll('src="/ma-logo.png"','src="data:image/png;base64,'+logo.toString('base64')+'"').replaceAll('src="/icon.svg"','src="data:image/svg+xml;base64,'+icon.toString('base64')+'"');
   const path=join(dir,'devis.html'),pdf=join(dir,'devis.pdf');
   await writeFile(path,'<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'"><style>'+css+'</style>'+html+'</html>');
   await run(executable,['--headless','--disable-gpu','--disable-background-networking','--no-pdf-header-footer','--user-data-dir='+join(dir,'profil'),'--print-to-pdf='+pdf,pathToFileURL(path).href],{timeout:35000,windowsHide:true});
   const file=await readFile(pdf);if(file.subarray(0,5).toString()!=='%PDF-')throw Error();
   return file;
 }catch{throw Error('Échec de la génération du PDF. Vérifiez le chemin et les autorisations du navigateur sur le serveur.');}
 finally{await rm(dir,{recursive:true,force:true,maxRetries:3}).catch(()=>{});}
}
