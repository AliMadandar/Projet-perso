import { readFileSync, writeFileSync } from 'node:fs';
import { catalog, tiers, units } from '../src/catalog.js';
import { fields, conditions } from '../src/domain.js';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const names = ['ui','mobile', 'money', 'voice', 'assistant', 'brief', 'photos','edition','writer','references','courrier','terrain', 'signature','sheet','billing','editor', 'app'];
const logo = 'data:image/svg+xml;base64,' + Buffer.from(read('web/icon.svg')).toString('base64');
let js = 'const modules={};let demoApi;\n' + read('scripts/demo-runtime.js') + '\n';
for (const name of names) {
  let source = read('web/' + name + '.js');
  const exports = [...source.matchAll(/export (?:async )?(?:const|function) ([$\w]+)/g)].map(m => m[1]);
  source = source.replace(/import (\{[^}]+\}) from '\.\/(\w+)\.js';/g, (_all, imports, file) => 'const ' + imports + '=modules.' + file + ';').replace(/export (?=(async )?(const|function))/g, '');
  if (name === 'ui') source = source.replace(/async function api\([\s\S]+?\n\}/, 'async function api(path,body){return demoApi(path,body);\n}');
  if (name === 'app') {
    js += 'demoApi=createDemoApi({...' + JSON.stringify({
      catalog,
      tiers,
      units,
      fields,
      conditions
    }) + ',today:modules.ui.today});\n';
    source = source.replace(/go\('Accueil',\s*null,\s*true\);\s*clearInterval\(poll\)/, "if(window.innerWidth<=900)go('Accueil',null,true);else go('editor',state.documents[0],true);clearInterval(poll)").replace(/if\s*\('serviceWorker'\s*in navigator\s*&&\s*location.protocol\s*!==\s*'file:'\)/, "if(false)");
  }
  js += 'modules.' + name + '=(()=>{\n' + source + '\nreturn {' + exports.join(',') + '};})();\n';
}
const css = read('web/style.css') + read('web/mobile.css') + '\n.demoband{background:#f5e8cc;color:#58491d;text-align:center;padding:6px;font:12px Arial,sans-serif}@media print{.demoband{display:none}}';
const html = read('web/index.html').replace('<link rel="stylesheet" href="/mobile.css">','').replace('<link rel="apple-touch-icon" href="/icon-192.png">','').replace('<link rel="manifest" href="/manifest.webmanifest">', '').replace('<link rel="stylesheet" href="/style.css">', '<style>' + css + '</style>').replace('<body>', '<body><div class="demoband">Aperçu interactif · Données fictives · Les modifications disparaissent à la fermeture ou au rechargement.</div>').replace('<script type="module" src="/app.js"></script>', () => '<script type="module">' + js + '</script>').replaceAll('/icon.svg', logo).replaceAll('/ma-logo.png','data:image/png;base64,'+readFileSync(new URL('../web/ma-logo.png',import.meta.url)).toString('base64'));
writeFileSync(new URL('../APERCU.html', import.meta.url), html);
