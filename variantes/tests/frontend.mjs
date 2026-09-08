// Business-logic checks with a minimal DOM/Stripe double; not browser or visual QA.
import assert from 'node:assert/strict';import vm from 'node:vm';import{readFile}from'node:fs/promises';import{webcrypto}from'node:crypto';
const code=await readFile(new URL('../checkout.js',import.meta.url),'utf8');const translations=JSON.parse(await readFile(new URL('../copy.json',import.meta.url),'utf8'));
class El{
 constructor(id=''){this.id=id;this.value='';this.checked=false;this.hidden=false;this.disabled=false;this.textContent='';this.attrs={};this.events={};this.dataset={};this.children=[];this.invalid='';this.classes=new Set();this.classList={toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c),contains:c=>this.classes.has(c)};}
 addEventListener(k,fn){this.events[k]=fn}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]||null}replaceChildren(...c){this.children=c;this.textContent=''}append(...c){this.children.push(...c)}setCustomValidity(t){this.invalid=t}reportValidity(){return!this.invalid}focus(){}scrollIntoView(){}
}
async function scenario(variant,{active=true,failConfirm=false}={}){
 const markup=await readFile(new URL('../../dist/checkout-'+variant+'.html',import.meta.url),'utf8');const ids=Object.fromEntries([...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new El(m[1])]));
 const form=new El('form'),money=[new El('money')],base=[new El('base')],customers=Object.values(ids).filter(e=>e.id.startsWith('customer-'));
 ids['customer-email'].value='buyer@example.com';ids['customer-name'].value='Test Buyer';if(ids['customer-email2'])ids['customer-email2'].value='buyer@example.com';
 const terms=Object.values(ids).filter(e=>e.id==='terms'||e.id==='terms-express'),save=Object.values(ids).filter(e=>e.id==='save-card'||e.id==='save-express');terms.forEach(e=>e.classes.add('terms-box'));save.forEach(e=>e.classes.add('save-card'));
 const selectors={'[data-customer]':customers,'.terms-box,.save-card':[...terms,...save],'.terms-box':terms,'.save-card':save,'#customer-email,#customer-email2':[ids['customer-email'],ids['customer-email2']].filter(Boolean),'[data-money]':[...money,...base],'[data-money="total"]':money,'[data-money="base"]':base};
 const doc={body:{},documentElement:{},title:'',getElementById:id=>ids[id]||null,querySelectorAll:s=>selectors[s]||[],querySelector:s=>s==='form'?form:null,createTreeWalker:()=>({nextNode:()=>false}),createElement:()=>new El()};
 const mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
 let submitted=0,consent=0,opts,total='ARS 36,000.00',paid=false,apiCalls=[];
 const stripeSession=()=>({currency:'ars',total:{total:{amount:total}},billingAddress:{address:{country:'AR'}}});
 const actions={getSession:stripeSession,confirm:async o=>{submitted++;opts=o;if(failConfirm)throw Error('network');paid=true;return{type:'success'}},applyPromotionCode:async()=>{total='ARS 30,000.00';return{type:'success'}},removePromotionCode:async()=>({type:'success'})};
 let sdk;const element=()=>({events:{},on(k,f){this.events[k]=f},mount(){this.events.ready?.({availablePaymentMethods:{applePay:true}})},destroy(){}});
 const Stripe=()=>({initCheckoutElementsSdk:()=>sdk={on(){},loadActions:async()=>({type:'success',actions}),createPaymentElement:element,createExpressCheckoutElement:element,getExpressCheckoutElement:()=>null,createBillingAddressElement:element}});
 const location={protocol:'https:',href:'https://dropixeditoralivros.com/checkout-'+variant+'.html',origin:'https://dropixeditoralivros.com',search:'',reload(){this.reloaded=true},assign(href){this.assigned=href}};
 const fetch=async(url,options)=>{const path=url.split('/').at(-1);apiCalls.push(path);const payload=JSON.parse(options.body);let data;
  if(path==='catalog')data={mode:'test',currencies:{usd:{amount:2700},ars:{amount:3600000}},selectedCurrency:'ars',country:'AR',automaticTax:false,allowCoupons:true};
  if(path==='session')data={sessionId:'cs_test_demo',clientSecret:'cs_test_demo_secret_fake',statusToken:'signed-test-token',currency:'ars',amountTotal:3600000};
  if(path==='consent'){assert.equal(payload.acceptedTerms,true);consent++;data={recorded:true};}
  if(path==='status')data={sessionId:'cs_test_demo',sessionStatus:paid?'complete':'open',paymentStatus:paid?'paid':'unpaid',currency:'ars',amountTotal:3600000,clientSecret:paid?undefined:'cs_test_demo_secret_fake'};
  if(path==='expire')data={sessionStatus:paid?'complete':'expired',paymentStatus:paid?'paid':'unpaid'};
  return Response.json(data);
 };
 const ctx=vm.createContext({CHECKOUT_CONFIG:{enabled:active,variant,publishableKey:'pk_test_mock',expectedMode:'test',apiBaseUrl:'https://worker.example',defaultLanguage:'es',showMediaPreview:true,media:{}},TRANSLATIONS:translations,document:doc,window:{Stripe},NodeFilter:{SHOW_TEXT:4},location,history:{replaceState(_a,_b,url){location.href=url.href}},localStorage:storage,sessionStorage:storage,URL,URLSearchParams,Intl,crypto:webcrypto,AbortController,setTimeout,clearTimeout,fetch,matchMedia:()=>({matches:true})});
 vm.runInContext(code,ctx);const flush=async()=>{for(let i=0;i<6;i++)await new Promise(setImmediate)};await flush();
 if(!active){assert.equal(apiCalls.length,0);assert.equal(ids['pay-button'].disabled,true);ids.language.value='pt';ids.language.events.change();assert.equal(doc.documentElement.lang,'pt-BR');return;}
 assert.equal(ids['pay-button'].disabled,false);assert.ok(money[0].textContent.includes('ARS'));assert.equal(ids.currency.value,'ars');
 form.events.submit({preventDefault(){}});await flush();assert.equal(submitted,0,'No payment without terms');
 terms[0].checked=true;terms[0].events.change();save[0].checked=true;save[0].events.change();
 if(ids['customer-email2']){ids['customer-email2'].value='different@example.com';form.events.submit({preventDefault(){}});await flush();assert.equal(submitted,0,'Mismatched emails blocked');ids['customer-email2'].value='buyer@example.com';}
 ids['coupon-code'].value='TEST';await ids['apply-coupon'].events.click();assert.ok(money[0].textContent.includes('30,000'));
 form.events.submit({preventDefault(){}});await flush();assert.equal(submitted,1);assert.equal(consent,1);assert.equal(opts.savePaymentMethod,true);assert.equal(opts.email,'buyer@example.com');
 if(failConfirm){assert.equal(ids['pay-button'].disabled,true);form.events.submit({preventDefault(){}});await flush();assert.equal(submitted,1,'No second payment while status is uncertain');}
 else{assert.equal(ids['pay-button'].disabled,true);assert.equal(ids['payment-status'].className,'state-panel success');}
}
for(const variant of 'abcde'){await scenario(variant,{active:false});await scenario(variant);}
await scenario('a',{failConfirm:true});
console.log('PASS frontend logic A–E: disabled preview/no requests, language selection, configured boot, dynamic totals/coupon, terms gate, matching emails, save-card choice, success and uncertain-payment protection. DOM/Stripe mocked; no browser/real payments.');
