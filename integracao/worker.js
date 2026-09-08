/* Backend exclusivo de pagamento. Não envia e-mails nem integra com n8n.
   Variáveis e instruções em CHECKOUT-LEIA-ME.md. Integração A–E com Elements. Não colocar segredos aqui. */
const json = (data, status = 200, origin = '') => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {})
  }
});
function encode64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decode64(value) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), c => c.charCodeAt(0));
}
async function signingKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function tokenFor(sessionId, env) {
  const payload = encode64(new TextEncoder().encode(JSON.stringify({ sessionId, expiresAt: Math.floor(Date.now() / 1000) + 172800 })));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env.CHECKOUT_TOKEN_SECRET), new TextEncoder().encode(payload));
  return payload + '.' + encode64(signature);
}
async function validToken(token, sessionId, env) {
  try {
    if (typeof token !== 'string' || token.length > 1200) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const verified = await crypto.subtle.verify('HMAC', await signingKey(env.CHECKOUT_TOKEN_SECRET), decode64(parts[1]), new TextEncoder().encode(parts[0]));
    if (!verified) return false;
    const claims = JSON.parse(new TextDecoder().decode(decode64(parts[0])));
    return claims.sessionId === sessionId && Number.isFinite(claims.expiresAt) && claims.expiresAt > Date.now() / 1000;
  } catch { return false; }
}
async function stripe(path, env, { method = 'GET', data, idempotencyKey } = {}) {
  const headers = { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY };
  if (env.STRIPE_API_VERSION) headers['Stripe-Version'] = env.STRIPE_API_VERSION;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  if (data) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  const response = await fetch('https://api.stripe.com/v1' + path, {
    method, headers, body: data ? data.toString() : undefined,
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    let error;try { error = (await response.json()).error; } catch {}
    console.error('stripe_request_failed', {status: response.status, code: error?.code, type: error?.type, requestId: response.headers.get('request-id')});
    throw new Error('stripe_request_failed');
  }
  return response.json();
}
async function readBody(request) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new Error('invalid_content_type');
  if (Number(request.headers.get('Content-Length')) > 8192) throw new Error('payload_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('missing_body');
  const chunks = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 8192) { await reader.cancel(); throw new Error('payload_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
// Prices are read from one multi-currency Stripe Price. No FX calculation.
const COUNTRY_CURRENCY={AR:'ars',UY:'uyu',MX:'mxn',CO:'cop',CL:'clp',PE:'pen',BO:'bob',PY:'pyg',CR:'crc',GT:'gtq',HN:'hnl',NI:'nio',DO:'dop',BR:'brl',EC:'usd',PA:'usd',SV:'usd',PR:'usd',US:'usd',ES:'eur',GQ:'xaf',AD:'eur',FR:'eur',DE:'eur',IT:'eur',PT:'eur',NL:'eur',BE:'eur',IE:'eur',AT:'eur',FI:'eur',GR:'eur',GB:'gbp',CA:'cad',AU:'aud',NZ:'nzd',CH:'chf',JP:'jpy'};
const VERSION='2026-09-08-v2';
function configuration(env){
  if(!env.SITE_ORIGIN||!env.ALFA_MAX_PRICE_ID||!env.STRIPE_SECRET_KEY||!env.CHECKOUT_TOKEN_SECRET||env.CHECKOUT_TOKEN_SECRET.length<32)throw Error('config');
  const site=new URL(env.SITE_ORIGIN);
  if(site.protocol!=='https:'||site.origin!==env.SITE_ORIGIN||!/^price_[A-Za-z0-9]+$/.test(env.ALFA_MAX_PRICE_ID)||!/^(sk|rk)_(test|live)_/.test(env.STRIPE_SECRET_KEY))throw Error('config');
  const live=/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY);
  if(live&&env.ALLOW_LIVE_PAYMENTS!=='true')throw Error('live_disabled');
  const prefix=env.SITE_PATH_PREFIX||'';
  if(prefix&&!/^\/[A-Za-z0-9_/-]+$/.test(prefix))throw Error('prefix');
  return {live,origin:site.origin,prefix:prefix.replace(/\/$/,''),fallback:(env.FALLBACK_CURRENCY||'usd').toLowerCase()};
}
async function catalog(env,config,country){
  const price=await stripe('/prices/'+env.ALFA_MAX_PRICE_ID+'?expand[]=currency_options',env);
  if(!price.active||price.recurring||price.livemode!==config.live||price.billing_scheme!=='per_unit')throw Error('invalid_price');
  const options={...price.currency_options,[price.currency]:{...price.currency_options?.[price.currency],unit_amount:price.unit_amount}};
  const permitted=env.ALLOWED_CURRENCIES?new Set(env.ALLOWED_CURRENCIES.toLowerCase().split(',').map(x=>x.trim())):null;
  const currencies={};
  for(const [currency,p]of Object.entries(options))if(/^[a-z]{3}$/.test(currency)&&Number.isSafeInteger(p.unit_amount)&&p.unit_amount>0&&(!permitted||permitted.has(currency)))currencies[currency]={amount:p.unit_amount};
  // The offer's USD reference is $27. A BRL base Price is allowed if its USD option is $27.
  if(currencies.usd?.amount!==2700||!currencies[config.fallback])throw Error('price_mismatch');
  const local=COUNTRY_CURRENCY[country];
  return {currencies,selectedCurrency:currencies[local]?local:config.fallback,country:country||null,mode:config.live?'live':'test',automaticTax:env.AUTOMATIC_TAX_ENABLED==='true',allowCoupons:env.ALLOW_PROMOTION_CODES==='true'};
}
async function authorizedSession(request,body,env,config){
  const id=body.sessionId;const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(typeof id!=='string'||!/^cs_[A-Za-z0-9_]{5,250}$/.test(id)||!await validToken(token,id,env))return null;
  const s=await stripe('/checkout/sessions/'+id,env);
  return s.metadata?.offer==='alfa_max'&&s.metadata?.integration==='variants_v2'&&s.livemode===config.live?s:null;
}
function publicStatus(s){return {sessionId:s.id,sessionStatus:s.status,paymentStatus:s.payment_status,currency:s.currency,amountTotal:s.amount_total,variant:s.metadata?.variant,clientSecret:s.status==='open'?s.client_secret:undefined};}
export default {async fetch(request,env){
  const origin=request.headers.get('Origin');
  if(!env.SITE_ORIGIN||origin!==env.SITE_ORIGIN)return json({error:'forbidden'},403);
  const path=new URL(request.url).pathname;
  if(!['/v2/catalog','/v2/session','/v2/status','/v2/consent','/v2/expire'].includes(path))return json({error:'not_found'},404,origin);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600','Vary':'Origin'}});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405,origin);
  let config;try{config=configuration(env);}catch{return json({error:'checkout_unavailable'},503,origin);}
  if(env.CHECKOUT_LIMITER){const result=await env.CHECKOUT_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});if(!result.success)return json({error:'too_many_requests'},429,origin);}
  let body;try{body=await readBody(request);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return json({error:'invalid_request'},400,origin);}
  try{
    if(path==='/v2/catalog')return json(await catalog(env,config,request.cf?.country),200,origin);
    if(path==='/v2/session'){
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId||'')||!['a','b','c','d','e'].includes(body.variant)||!['es','pt','en'].includes(body.language))return json({error:'invalid_request'},400,origin);
      const offer=await catalog(env,config,request.cf?.country);
      if(!Object.hasOwn(offer.currencies,body.currency))return json({error:'currency_unavailable'},400,origin);
      const p=new URLSearchParams({mode:'payment',ui_mode:'elements',currency:body.currency,locale:{es:'es-419',pt:'pt-BR',en:'en'}[body.language],customer_creation:'always','line_items[0][price]':env.ALFA_MAX_PRICE_ID,'line_items[0][quantity]':'1','payment_method_types[0]':'card','adaptive_pricing[enabled]':'false','saved_payment_method_options[payment_method_save]':'enabled',return_url:config.origin+config.prefix+'/checkout-'+body.variant+'.html?session_id={CHECKOUT_SESSION_ID}&lang='+body.language,'metadata[offer]':'alfa_max','metadata[integration]':'variants_v2','metadata[variant]':body.variant,'metadata[language]':body.language,'metadata[request_id]':body.requestId,'payment_intent_data[metadata][offer]':'alfa_max','payment_intent_data[metadata][variant]':body.variant});
      if(offer.automaticTax)p.set('automatic_tax[enabled]','true');
      if(offer.allowCoupons)p.set('allow_promotion_codes','true');
      for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'])if(typeof body.tracking?.[k]==='string')p.set('metadata['+k+']',body.tracking[k].slice(0,200));
      const s=await stripe('/checkout/sessions',env,{method:'POST',data:p,idempotencyKey:'alfa-v2-'+body.requestId});
      if(!s.client_secret||s.currency!==body.currency)throw Error('session_mismatch');
      return json({...publicStatus(s),statusToken:await tokenFor(s.id,env)},200,origin);
    }
    const session=await authorizedSession(request,body,env,config);
    if(!session)return json({error:'forbidden'},403,origin);
    if(path==='/v2/status')return json(publicStatus(session),200,origin);
    if(path==='/v2/expire'){
      if(session.status!=='open')return json(publicStatus(session),200,origin);
      try{await stripe('/checkout/sessions/'+session.id+'/expire',env,{method:'POST',data:new URLSearchParams()});}catch{/* Payment may have completed concurrently. Retrieve its authoritative state. */}
      return json(publicStatus(await stripe('/checkout/sessions/'+session.id,env)),200,origin);
    }
    if(body.acceptedTerms!==true||typeof body.savePaymentMethod!=='boolean'||!['es','pt','en'].includes(body.language))return json({error:'consent_required'},400,origin);
    if(session.status!=='open')return json({error:'session_not_open'},409,origin);
    const p=new URLSearchParams({'metadata[terms_accepted_at]':new Date().toISOString(),'metadata[terms_version]':VERSION,'metadata[consent_language]':body.language,'metadata[save_card_opt_in]':String(body.savePaymentMethod)});
    await stripe('/checkout/sessions/'+session.id,env,{method:'POST',data:p});
    return json({recorded:true},200,origin);
  }catch{return json({error:'payment_service_unavailable'},502,origin);}
}};
