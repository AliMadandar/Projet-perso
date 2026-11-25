import { $,esc,button,select,input,api,toast,today } from './ui.js';
import { amounts,euros } from './money.js';
// Libellés de saisie en persan ; la ligne enregistrée garde le libellé français du catalogue.
const faLabels=('نصب کاشی کف|نصب پارکت لمینت|نصب پارکت مهندسی|نصب کفپوش وینیل|نصب قرنیز|کندن پوشش قبلی|اجرای پرایمر|تراز کردن کف|نصب کاشی دیوار|عایق زیر کاشی|نصب زیردوشی|نصب پارتیشن دوش|نصب شیر مخلوط|نصب کابینت روشویی|نصب توالت|نصب آبگرمکن ۵۰ لیتری|رنگ دیوار|رنگ سقف|بتونه کاری|نصب کاشی بین کابینتی|مونتاژ کابینت|تیغه گچی|نصب پریز|نصب تهویه|اجرای میکروسمنت|پوشاندن محل کار|حمل نخاله|نیروی کار اضافی|شست‌وشوی دیوار|کندن کاغذ دیواری|ترمیم ترک|بتونه و سنباده|رنگ آستر|دو دست رنگ ساتن|رنگ چوب|رنگ در دو طرف|نصب پوشش فایبرگلاس|تمیزکاری کپک سطحی|رنگ نما|نصب کاشی ۹۰ در ۹۰|نصب کاشی مورب|نصب موزاییک|نصب کاشی دیوار بزرگ|پروفیل لبه|بندکشی اپوکسی|ترمیم بند کاشی|کاشی پله|کندن موکت یا کفپوش|تراشیدن چسب|زیرلایه عایق صدا|پارکت چوبی چسبی|سنباده و لاک پارکت|نصب آستانه در|جمع‌آوری زیردوشی|آب‌بندی گوشه‌ها|نصب کفشور خطی|شیب‌بندی|پوشش فریم توالت|نصب وان|تغییر لوله آب|لوله فاضلاب|نصب کلکتور|توالت دیواری|روشویی دوقلو|تعویض آبگرمکن برقی|آبگرمکن پمپ حرارتی|آبگرمکن خورشیدی|سیستم خورشیدی ترکیبی|شیر ایمنی آبگرمکن|عایق لوله آب گرم|تعویض تابلو برق|مدار اختصاصی|نقطه روشنایی|کلید تبدیل|چراغ توکار|تهویه تک‌جریان|تهویه دوجریان|دریچه تهویه|تعویض رادیاتور|حوله خشک‌کن|ترموستات|عایق دمشی سقف|عایق داخلی دیوار|عایق زیر کف|لایه بخاربند|نصب در داخلی|در ریلی کمد|پنجره دوجداره|پنجره سقفی|کرکره برقی|سقف کاذب|درزگیری گچ‌برگ|طاقچه ضد رطوبت|باز کردن کابینت|صفحه کابینت|نصب سینک|تخریب تیغه غیر باربر|بتن‌ریزی|نصب مش فولادی|اجرای کف‌سازی|پرایمر قیری|لایه زیرین عایق|عایق نهایی|تعویض ناودان|ترمیم آب‌بندی اتصال سقف|لاک میکروسمنت|تفکیک نخاله|حمل با کانتینر|نظافت نهایی|هزینه رفت‌وآمد').split('|');
const unitFa={'m²':'متر مربع','m³':'متر مکعب','ml':'متر طول','h':'ساعت','u':'عدد','forfait':'مقطوع'};
const rooms=[['Cuisine','آشپزخانه'],['Salle de bains','حمام'],['Séjour','پذیرایی'],['Chambre','اتاق'],['Extérieur','فضای بیرون'],['Chantier','کل پروژه']];
const tiers=['فقط نصب','اقتصادی','استاندارد','ممتاز'];
const label=s=>faLabels[Number(s.id?.slice(1))-1]||s.label;
export function terrain(ctx,initial){
 const {state,main,go,done,fresh}=ctx,edit=state.me.role!=='Lecture';
 let d=initial?structuredClone(initial):null,dirty=false;
 const menu=()=>state.documents.filter(x=>x.status==='Brouillon').map(x=>button('draft-'+x.id,x.title+' · '+x.number,'doc')).join('');
 const fields=()=>input('عنوان پروژه (به فرانسوی برای مشتری)','title',d.title)+input('نام مشتری','name',d.client.name)+input('آدرس محل کار','site',d.site)+input('ایمیل مشتری','email',d.client.email,'email');
 function render(){
 main.innerHTML='<section class="terrain" lang="fa" dir="rtl"><header><h1>دفتر کارگاه</h1>'+button('fr','Français','back')+'</header>'+(d?
 '<form id="faQuote"><div class="card pad">'+fields()+'</div><section class="card pad"><h2>افزودن خدمت</h2>'+select('نوع کار','service',state.services.map(s=>[s.id,label(s)+' · '+s.label]),state.services[0]?.id)+select('اتاق یا بخش','room',rooms,'Cuisine')+select('نوع قیمت','tier',tiers.map((v,i)=>[i,v]),0)+input('مقدار','quantity',1,'number','min=".01" max="10000" step=".01"')+input('مالیات (%)','tax',20,'number','min="0" max="100" step=".01"')+'<p id="faPrice"></p>'+button('add','افزودن به پیش‌فاکتور','plus')+'</section><section class="card pad"><h2>اقلام پیش‌فاکتور</h2>'+d.lines.map((l,i)=>'<div class="member"><div>'+esc(label(state.services.find(s=>s.id===l.serviceId)||l))+' · '+l.quantity/100+' '+esc(unitFa[l.unit]||l.unit)+'</div>'+button('remove-'+i,'حذف','trash')+'</div>').join('')+'<p>جمع با مالیات · '+euros(amounts(d.lines,d.discount,d.deposit).total)+'</p></section>'+button('save','ذخیره پیش‌نویس برای دفتر','check','primary')+'</form>':
 (edit?button('create','پیش‌فاکتور جدید','plus','primary'):'')+'<h2>پیش‌نویس‌ها</h2><div class="quick">'+menu()+'</div>')+'</section>';
 const f=$('#faQuote');if(!f)return;
 const v=f.elements;f.onsubmit=e=>e.preventDefault();function price(){const s=state.services.find(s=>s.id===v.service.value);$('#faPrice').textContent=s?euros(s.prices[Number(v.tier.value)])+' / '+unitFa[s.unit]:'';}
 f.oninput=e=>{if(['title','site'].includes(e.target.name)){d[e.target.name]=e.target.value;dirty=true;}if(['name','email'].includes(e.target.name)){d.client[e.target.name]=e.target.value;dirty=true;}price();};price();
 }
 main.onclick=async e=>{const a=e.target.closest('[data-act]')?.dataset.act;if(!a)return;try{
 if(a==='fr'){if(dirty&&!confirm('تغییرات ذخیره نشده‌اند. خارج می‌شوید؟'))return;dirty=false;go('Accueil',null,true);return;}
 if(a==='create'){d=fresh(state);d.title='Travaux de rénovation';dirty=true;}
 if(a.startsWith('draft-')){d=await api('document/'+a.slice(6));if(!edit){go('editor',d);return;}}
 if(a==='add'){const v=$('#faQuote').elements,s=state.services.find(x=>x.id===v.service.value);if(!v.quantity.reportValidity()||!v.tax.reportValidity()||!Number(v.quantity.value))return;
 d.lines.push({serviceId:s.id,label:s.label,unit:s.unit,tier:Number(v.tier.value),lot:v.room.value,quantity:Math.round(Number(v.quantity.value)*100),price:s.prices[Number(v.tier.value)],tax:Math.round(Number(v.tax.value)*100)});dirty=true;}
 if(a.startsWith('remove-')){d.lines.splice(Number(a.slice(7)),1);dirty=true;}
 if(a==='save'){if(!$('#faQuote').reportValidity())return;const saved=await api('documents',d);done(saved);dirty=false;d=null;toast('پیش‌نویس ذخیره شد');}
 render();
 }catch(error){toast('خطا · '+error.message);}};
 render();return ()=>dirty;
}
