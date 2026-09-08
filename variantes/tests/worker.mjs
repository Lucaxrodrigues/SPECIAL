import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../../integracao/worker.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const origin='https://dropixeditoralivros.com',env={SITE_ORIGIN:origin,ALFA_MAX_PRICE_ID:'price_example',STRIPE_SECRET_KEY:'sk_test_mock',CHECKOUT_TOKEN_SECRET:'test-only-secret-'.repeat(4)};
let calls=[],session=null,expireRace=false;const price={active:true,livemode:false,billing_scheme:'per_unit',currency:'brl',unit_amount:14000,currency_options:{usd:{unit_amount:2700},ars:{unit_amount:3600000},uyu:{unit_amount:110000}}};
globalThis.fetch=async(url,opts={})=>{
 assert.ok(url.startsWith('https://api.stripe.com/v1/'));calls.push({url,opts});
 if(url.includes('/prices/'))return Response.json(price);
 if(url.endsWith('/expire')){session.status=expireRace?'complete':'expired';if(expireRace)session.payment_status='paid';return Response.json(session);}
 if(url.endsWith('/checkout/sessions')&&opts.method==='POST'){
  const p=new URLSearchParams(opts.body);session={id:'cs_test_sample123',client_secret:'cs_test_sample123_secret_fake',status:'open',payment_status:'unpaid',currency:p.get('currency'),amount_total:price.currency_options[p.get('currency')].unit_amount,livemode:false,metadata:{offer:'alfa_max',integration:'variants_v2',variant:p.get('metadata[variant]')}};
 }
 return Response.json(session);
};
const req=(path,body={},extras={})=>{const r=new Request('https://worker.example/v2/'+path,{method:'POST',headers:{Origin:extras.origin||origin,'Content-Type':'application/json',...(extras.token?{Authorization:'Bearer '+extras.token}:{})},body:JSON.stringify(body)});Object.defineProperty(r,'cf',{value:{country:extras.country||'AR'}});return r;};
let r=await worker.fetch(req('catalog'),env);assert.equal(r.status,200);let data=await r.json();assert.equal(data.selectedCurrency,'ars');assert.equal(data.currencies.ars.amount,3600000);assert.equal(data.currencies.usd.amount,2700);
r=await worker.fetch(req('catalog',{}, {country:'UY'}),env);assert.equal((await r.json()).selectedCurrency,'uyu');
r=await worker.fetch(req('catalog',{}, {country:'ZZ'}),env);assert.equal((await r.json()).selectedCurrency,'usd');
r=await worker.fetch(req('catalog',{}, {origin:'https://bad.example'}),env);assert.equal(r.status,403);
r=await worker.fetch(req('catalog'),{...env,STRIPE_SECRET_KEY:'sk_live_mock'});assert.equal(r.status,503);
r=await worker.fetch(req('catalog'),{...env,CHECKOUT_LIMITER:{limit:async()=>({success:false})}});assert.equal(r.status,429);
const payload={requestId:'123e4567-e89b-42d3-a456-426614174000',variant:'c',language:'es',currency:'ars',amount:1,return_url:'https://bad.example',tracking:{utm_source:'test',email:'notallowed'}};
r=await worker.fetch(req('session',{...payload,currency:'zzz'}),env);assert.equal(r.status,400);
r=await worker.fetch(req('session',payload),env);assert.equal(r.status,200);data=await r.json();assert.equal(data.currency,'ars');assert.equal(data.amountTotal,3600000);const token=data.statusToken,id=data.sessionId;
let p=new URLSearchParams(calls.at(-1).opts.body);assert.equal(p.get('ui_mode'),'elements');assert.equal(p.get('currency'),'ars');assert.equal(p.get('line_items[0][price]'),'price_example');assert.equal(p.get('adaptive_pricing[enabled]'),'false');assert.ok(p.get('return_url').startsWith(origin+'/checkout-c.html?'));assert.equal(p.get('metadata[utm_source]'),'test');assert.ok(!p.has('metadata[email]'));const idem=calls.at(-1).opts.headers['Idempotency-Key'];await worker.fetch(req('session',payload),env);assert.equal(calls.at(-1).opts.headers['Idempotency-Key'],idem);
r=await worker.fetch(req('status',{sessionId:id}),env);assert.equal(r.status,403);
r=await worker.fetch(req('status',{sessionId:'cs_test_other'},{token}),env);assert.equal(r.status,403);
r=await worker.fetch(req('consent',{sessionId:id,acceptedTerms:false,savePaymentMethod:false,language:'es'},{token}),env);assert.equal(r.status,400);
r=await worker.fetch(req('consent',{sessionId:id,acceptedTerms:true,savePaymentMethod:false,language:'es'},{token}),env);assert.equal(r.status,200);p=new URLSearchParams(calls.at(-1).opts.body);assert.equal(p.get('metadata[save_card_opt_in]'),'false');assert.ok(p.get('metadata[terms_accepted_at]'));
r=await worker.fetch(req('expire',{sessionId:id},{token}),env);assert.equal((await r.json()).sessionStatus,'expired');
session.status='open';expireRace=true;r=await worker.fetch(req('expire',{sessionId:id},{token}),env);data=await r.json();assert.equal(data.sessionStatus,'complete');assert.equal(data.paymentStatus,'paid');assert.ok(!data.clientSecret);
session.customer_details={email:'private@example.com'};r=await worker.fetch(req('status',{sessionId:id},{token}),env);assert.ok(!(await r.text()).includes('private@example'));
const now=Date.now;Date.now=()=>now()+172801000;r=await worker.fetch(req('status',{sessionId:id},{token}),env);Date.now=now;assert.equal(r.status,403);
price.currency_options.usd.unit_amount=1;r=await worker.fetch(req('catalog'),env);assert.equal(r.status,502);
console.log('PASS Worker: manual ARS/UYU, USD fallback with BRL base, fixed server pricing, CORS, test/live guard, rate limit, idempotency key, consent, signed status/expiry and expire/payment race. Stripe is mocked.');
