(() => {
  'use strict';
  const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)];
  const cfg=CHECKOUT_CONFIG,query=new URLSearchParams(location.search),languages={es:'es-419',pt:'pt-BR',en:'en'};
  let savedLanguage;try{savedLanguage=localStorage.getItem('alfa-language');}catch{}
  let lang=[query.get('lang'),savedLanguage,cfg.defaultLanguage].find(x=>Object.hasOwn(languages,x))||'es';
  const t=source=>lang==='es'?source:(TRANSLATIONS[source]?.[lang==='pt'?0:1]||source);
  const texts=[],attrs=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode;if(node.parentElement.closest('script,style'))continue;
    const key=node.textContent.trim();if(TRANSLATIONS[key])texts.push({node,key,before:node.textContent.match(/^\s*/)[0],after:node.textContent.match(/\s*$/)[0]});
  }
  all('[placeholder],[aria-label]').forEach(el=>['placeholder','aria-label'].forEach(attr=>{const key=el.getAttribute(attr);if(TRANSLATIONS[key])attrs.push({el,attr,key});}));
  function translate(){document.documentElement.lang=languages[lang];$('language').value=lang;texts.forEach(x=>x.node.textContent=x.before+t(x.key)+x.after);attrs.forEach(x=>x.el.setAttribute(x.attr,t(x.key)));document.title='Alfa Max · '+t('Pago');}
  translate();
  function configured(){try{const url=new URL(cfg.apiBaseUrl);return cfg.enabled&&url.protocol==='https:'&&!url.username&&!url.password&&location.protocol==='https:'&&['test','live'].includes(cfg.expectedMode)&&cfg.publishableKey.startsWith('pk_'+cfg.expectedMode+'_');}catch{return false;}}
  const active=configured();let offer=null,session=null,checkout=null,actions=null,paymentElement=null,busy=false,attempt=null,ready=false,uncertain=false,complete=false;
  const attemptKey='alfa-v2-attempt:'+cfg.variant;
  let sessionId=query.get('session_id');
  function read(key){try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}}
  function write(key,data){try{sessionStorage.setItem(key,JSON.stringify(data));}catch{}}
  function forget(key){try{sessionStorage.removeItem(key);}catch{}}
  function show(key,error=false){const box=$('payment-status');box.className='state-panel'+(error?' error':'');box.textContent=t(key);}
  function controls(){
    $('pay-button').disabled=!active||!ready||busy||uncertain||complete;
    $('language').disabled=busy;$('currency').disabled=!active||!offer||busy||complete;
    $('apply-coupon').disabled=!actions||busy||!ready||complete;
    $('remove-coupon').disabled=busy||complete;
    const mount=$('stripe-express-element');if(mount){const disabled=busy||!terms()||uncertain||complete;mount.inert=disabled;mount.classList.toggle('disabled-wallet',disabled);$('express-hint').hidden=terms();}
    $('retry-payment').disabled=busy;$('new-payment').disabled=busy;
  }
  function terms(){return $('terms').checked;}
  function saveCard(){return $('save-card').checked;}
  all('.terms-box,.save-card').forEach(input=>input.addEventListener('change',()=>{all(input.classList.contains('terms-box')?'.terms-box':'.save-card').forEach(other=>other.checked=input.checked);controls();}));
  function format(amount,currency){const zero=['bif','clp','djf','gnf','jpy','kmf','krw','mga','pyg','rwf','vnd','vuv','xaf','xof','xpf'];const divisor=zero.includes(currency)?1:['isk','ugx'].includes(currency)?100:10**new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;return new Intl.NumberFormat(languages[lang],{style:'currency',currency:currency.toUpperCase(),currencyDisplay:'code'}).format(amount/divisor);}
  function updateTotals(s){
    // Reading Stripe's formatted total is required by its Checkout SDK.
    const formatted=s.total.total.amount;const currency=s.currency.toUpperCase();
    all('[data-money="total"]').forEach(el=>el.textContent=formatted+' '+currency);
    if(offer?.currencies[s.currency])all('[data-money="base"]').forEach(el=>el.textContent=format(offer.currencies[s.currency].amount,s.currency));
    $('currency').value=s.currency;
  }
  async function api(path,payload={},token){
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);
    try{const response=await fetch(cfg.apiBaseUrl.replace(/\/$/,'')+'/v2/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(payload),credentials:'omit',cache:'no-store',signal:c.signal});if(!response.ok)throw Error('request_failed');return await response.json();}finally{clearTimeout(timer);}
  }
  function statusToken(){return session?.statusToken||read('alfa-v2-order:'+sessionId)?.statusToken;}
  function media(){
    all('[data-media-slot]').forEach(slot=>{
      const data=cfg.media?.[slot.dataset.mediaSlot];
      const url=value=>{if(!value)return null;try{const u=new URL(value,location.href);return (u.protocol==='https:'||(u.origin===location.origin&&['http:','file:'].includes(u.protocol)))?u.href:null;}catch{return null;}};
      const src=url(data?.src);let content=null;
      if(data?.kind==='testimonial'&&data.verified===true&&typeof data.text==='string'&&data.text.trim()&&typeof data.author==='string'&&data.author.trim()){
        content=document.createElement('blockquote');const quote=document.createElement('p');quote.textContent=data.text;content.append(quote);const author=document.createElement('cite');author.textContent=data.author;content.append(author);
        if(src){const photo=document.createElement('img');photo.src=src;photo.alt=data.alt||data.author;photo.loading='lazy';photo.style.maxWidth='90px';photo.style.marginBottom='12px';content.prepend(photo);}
      }else if(src&&data.kind==='image'){content=document.createElement('img');content.src=src;content.alt=data.alt||'';content.loading='lazy';content.decoding='async';}
      else if(src&&data.kind==='video'){content=document.createElement('video');content.src=src;content.controls=true;content.playsInline=true;content.preload='none';const poster=url(data.poster);if(poster)content.poster=poster;content.setAttribute('aria-label',data.alt||t('Ejemplo visual · Video'));}
      if(content){slot.replaceChildren(content);slot.className='slot media-ready';slot.style.removeProperty('background');slot.style.removeProperty('min-height');slot.style.removeProperty('color');content.addEventListener('error',()=>{slot.hidden=true;},{once:true});}
      else if(cfg.enabled||!cfg.showMediaPreview)slot.hidden=true;
    });
    all('.media-grid').forEach(grid=>{if([...grid.children].every(x=>x.hidden))grid.hidden=true;});
  }
  media();
  // C keeps all sections visible, with a working progress/navigation indicator.
  function step(id){all('.three-step button').forEach(btn=>{const on=btn.dataset.step===id;btn.classList.toggle('active',on);btn.setAttribute('aria-current',on?'step':'false');});}
  all('[data-step]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.step==='payment-step'&&!validateCustomer())return;step(btn.dataset.step);$(btn.dataset.step)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}));
  $('details-step')?.addEventListener('focusin',()=>step('details-step'));
  $('payment-step').addEventListener('focusin',()=>step('payment-step'));
  function validateCustomer(){
    const email=$('customer-email'),repeat=$('customer-email2');
    if(repeat)repeat.setCustomValidity(email.value.trim().toLowerCase()===repeat.value.trim().toLowerCase()?'':t('Los correos electrónicos no coinciden.'));
    for(const input of all('[data-customer]'))if(!input.reportValidity())return false;
    return true;
  }
  all('#customer-email,#customer-email2').forEach(input=>input.addEventListener('input',()=>$('customer-email2')?.setCustomValidity('')));
  const tracking=()=>Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].map(k=>[k,query.get(k)?.slice(0,200)]).filter(x=>x[1]));
  function makeAttempt(currency){const result={requestId:crypto.randomUUID(),currency,language:lang,variant:cfg.variant,tracking:tracking()};write(attemptKey,result);return result;}
  async function createSession(){
    attempt=read(attemptKey);
    if(!attempt||attempt.currency!==$('currency').value||attempt.language!==lang)attempt=makeAttempt($('currency').value);
    const data=await api('session',attempt);
    if(!data.sessionId?.startsWith('cs_')||typeof data.clientSecret!=='string'||!data.clientSecret.includes('_secret_')||typeof data.statusToken!=='string')throw Error('invalid_session');
    session=data;sessionId=data.sessionId;write('alfa-v2-order:'+sessionId,{statusToken:data.statusToken});
    attempt.sessionId=sessionId;write(attemptKey,attempt);
    const url=new URL(location.href);url.searchParams.set('session_id',sessionId);url.searchParams.set('lang',lang);history.replaceState(null,'',url);
    return data;
  }
  function hidePayment(){ready=false;paymentElement?.destroy();paymentElement=null;checkout?.getExpressCheckoutElement?.()?.destroy();$('express-shell')?.setAttribute('hidden','');$('express-divider')?.setAttribute('hidden','');$('stripe-placeholder').hidden=true;all('[data-customer]').forEach(el=>el.disabled=true);controls();}
  async function checkStatus(remount=false){
    show('Comprobando el pago…');const token=statusToken();
    if(!token){uncertain=true;hidePayment();show('No podemos verificar esta compra en este navegador. Contacta con soporte antes de volver a pagar.',true);return;}
    const s=await api('status',{sessionId},token);session={...s,statusToken:token};
    if(s.sessionStatus==='complete'&&s.paymentStatus==='paid'){
      complete=true;uncertain=false;hidePayment();forget(attemptKey);$('retry-payment').hidden=true;
      const box=$('payment-status');box.className='state-panel success';box.replaceChildren();const heading=document.createElement('h2');heading.className='section-title';heading.textContent=t('Pago confirmado');const message=document.createElement('p');message.textContent=t('Recibirás el enlace de descarga y las instrucciones de acceso en hasta 24 horas. Revisa también la carpeta de spam.');const ref=document.createElement('p');ref.textContent=t('Referencia')+': '+sessionId;box.append(heading,message,ref);
      if(Number.isSafeInteger(s.amountTotal)&&s.currency)all('[data-money="total"]').forEach(el=>el.textContent=format(s.amountTotal,s.currency));
    }else if(s.sessionStatus==='expired'){
      uncertain=false;hidePayment();forget(attemptKey);show('Esta sesión caducó. Puedes iniciar una nueva compra si no realizaste el pago.');$('new-payment').hidden=false;$('retry-payment').hidden=true;
    }else if(s.sessionStatus==='open'&&remount){uncertain=false;await mount(s.clientSecret);}
    else{uncertain=true;hidePayment();show('El pago aún no está confirmado. Consulta el estado antes de volver a pagar.',true);$('retry-payment').textContent=t('Consultar estado');$('retry-payment').hidden=false;}
  }
  let stripePromise;
  function loadStripe(){
    if(window.Stripe)return Promise.resolve();if(stripePromise)return stripePromise;
    stripePromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://js.stripe.com/dahlia/stripe.js';s.async=true;const timer=setTimeout(()=>{s.remove();stripePromise=null;reject(Error('timeout'));},20000);s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);s.remove();stripePromise=null;reject(Error('stripe_load'));};document.head.append(s);});return stripePromise;
  }
  async function mount(secret){
    if(checkout){location.reload();return;}
    await loadStripe();
    const stripe=window.Stripe(cfg.publishableKey,{locale:languages[lang]});
    checkout=stripe.initCheckoutElementsSdk({clientSecret:secret,elementsOptions:{appearance:{theme:'stripe',variables:{colorPrimary:'#1d8f67',colorText:'#18212b',fontFamily:'system-ui, sans-serif',fontSizeBase:'16px',borderRadius:'10px'}},savedPaymentMethod:{enableSave:'never',enableRedisplay:'auto'}},adaptivePricing:{allowed:false}});
    checkout.on('change',s=>{updateTotals(s);controls();});
    const result=await checkout.loadActions();if(result.type!=='success')throw Error('load_actions');actions=result.actions;updateTotals(actions.getSession());
    paymentElement=checkout.createPaymentElement({layout:'accordion',fields:{billingDetails:{name:'never',email:'never',phone:'never'}}});
    paymentElement.on('ready',()=>{ready=true;$('stripe-placeholder').hidden=true;all('[data-customer]').forEach(el=>el.disabled=false);controls();});
    paymentElement.on('loaderror',()=>{ready=false;show('No se pudo cargar el pago. Inténtalo otra vez.',true);$('retry-payment').hidden=false;controls();});
    paymentElement.mount('#stripe-payment-element');
    if(offer.automaticTax){$('billing-address').hidden=false;checkout.createBillingAddressElement().mount('#stripe-billing-address');}
    if($('express-shell')){
      all('#express-shell .preview-only').forEach(x=>x.hidden=true);
      const express=checkout.createExpressCheckoutElement({buttonHeight:48,buttonTheme:{applePay:'black',googlePay:'black'},layout:{maxColumns:1}});
      const available=ev=>{const methods=ev.availablePaymentMethods||ev.paymentMethods;const yes=!!methods&&Object.values(methods).some(Boolean);$('express-shell').hidden=!yes;$('express-live').hidden=!yes;if($('express-divider'))$('express-divider').hidden=!yes;controls();};
      express.on('ready',available);express.on('availablepaymentmethodschange',available);
      express.on('confirm',event=>confirmPayment(event));express.mount('#stripe-express-element');
    }
    $('payment-status').textContent='';$('retry-payment').hidden=true;
  }
  async function confirmPayment(expressEvent){
    if(busy||!actions||uncertain||complete)return;
    if(!terms()||(!expressEvent&&!validateCustomer())){show('Revisa tus datos y acepta las condiciones antes de pagar.',true);if(!terms())$('terms').focus();expressEvent?.paymentFailed?.({reason:'fail'});return;}
    busy=true;controls();show('Procesando…');let submitted=false;
    try{
      const recorded=await api('consent',{sessionId,acceptedTerms:true,savePaymentMethod:saveCard(),language:lang},statusToken());if(recorded.recorded!==true)throw Error('consent');
      const options={redirect:'if_required',savePaymentMethod:saveCard()};
      if(expressEvent)options.expressCheckoutConfirmEvent=expressEvent;
      else{options.email=$('customer-email').value.trim();const name=$('customer-name').value.trim();options.billingAddress={...(actions.getSession().billingAddress||{}),name};const phone=$('customer-phone')?.value.replace(/\D/g,'');if(phone)options.phoneNumber=($('dial-code')?.value||'')+phone;}
      updateTotals(actions.getSession());submitted=true;
      const result=await actions.confirm(options);
      if(result.type==='error'){
        show(result.error?.message||'Tu banco solicita completar los datos en el formulario seguro.',true);expressEvent?.paymentFailed?.({reason:'fail'});
      }else{await checkStatus(false);}
    }catch{
      if(submitted){uncertain=true;show('No se pudo confirmar el pago. Comprueba el estado antes de repetirlo.',true);$('retry-payment').textContent=t('Consultar estado');$('retry-payment').hidden=false;}
      else show('No se pudo confirmar el pago. Comprueba el estado antes de repetirlo.',true);
      expressEvent?.paymentFailed?.({reason:'fail'});
    }finally{busy=false;controls();}
  }
  document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();if(active)confirmPayment();});
  $('apply-coupon').addEventListener('click',async()=>{if(!actions||busy)return;busy=true;controls();try{const result=await actions.applyPromotionCode($('coupon-code').value.trim());if(result.type==='error')throw Error();updateTotals(actions.getSession());$('coupon-message').textContent=t('Cupón aplicado.');$('remove-coupon').hidden=false;}catch{$('coupon-message').textContent=t('No se pudo aplicar este cupón.');}finally{busy=false;controls();}});
  $('remove-coupon').addEventListener('click',async()=>{if(!actions||busy)return;busy=true;controls();try{const result=await actions.removePromotionCode();if(result.type==='error')throw Error();updateTotals(actions.getSession());$('coupon-code').value='';$('coupon-message').textContent='';$('remove-coupon').hidden=true;}catch{$('coupon-message').textContent=t('No se pudo aplicar este cupón.');}finally{busy=false;controls();}});
  async function changeSettings(language,currency){
    if(busy)return;busy=true;controls();
    try{
      if(sessionId){const token=statusToken();if(!token)throw Error('no_auth');const result=await api('expire',{sessionId},token);if(result.sessionStatus!=='expired'){await checkStatus(false);return;}}
      forget(attemptKey);const url=new URL(location.href);url.searchParams.delete('session_id');url.searchParams.set('lang',language);if(currency)url.searchParams.set('currency',currency);else url.searchParams.delete('currency');
      try{localStorage.setItem('alfa-language',language);}catch{}location.assign(url.href);
    }catch{show('No se pudo confirmar el pago. Comprueba el estado antes de repetirlo.',true);$('retry-payment').hidden=false;}
    finally{busy=false;controls();}
  }
  $('language').addEventListener('change',()=>{const selected=$('language').value;if(!active){lang=selected;try{localStorage.setItem('alfa-language',lang);}catch{}translate();return;}changeSettings(selected,$('currency').value);});
  $('currency').addEventListener('change',()=>changeSettings(lang,$('currency').value));
  $('new-payment').addEventListener('click',()=>changeSettings(lang,$('currency').value));
  $('retry-payment').addEventListener('click',async()=>{if(busy)return;if(!sessionId){location.reload();return;}busy=true;controls();try{await checkStatus(true);}catch{show('No se pudo cargar el pago. Inténtalo otra vez.',true);}finally{busy=false;controls();}});
  async function start(){
    controls();if(!active)return;
    $('mode-banner').hidden=cfg.expectedMode==='live';$('mode-banner').textContent=t('Modo de prueba · No se cobran importes reales');$('stripe-placeholder').textContent=t('Cargando el formulario seguro…');busy=true;controls();
    try{
      offer=await api('catalog');if(offer.mode!==cfg.expectedMode||!offer.currencies||!Object.hasOwn(offer.currencies,offer.selectedCurrency))throw Error('config_mismatch');
      $('currency').replaceChildren(...Object.keys(offer.currencies).map(code=>{const op=document.createElement('option');op.value=code;op.textContent=code.toUpperCase();return op;}));
      const explicit=query.get('currency');$('currency').value=Object.hasOwn(offer.currencies,explicit)?explicit:offer.selectedCurrency;
      const currency=$('currency').value;all('[data-money]').forEach(el=>el.textContent=format(offer.currencies[currency].amount,currency));
      const dials={AR:'+54',UY:'+598',MX:'+52',CO:'+57',CL:'+56',PE:'+51',ES:'+34',US:'+1',BR:'+55',BO:'+591',PY:'+595',CR:'+506',GT:'+502',HN:'+504',NI:'+505',PA:'+507',SV:'+503',DO:'+1'};if($('dial-code')&&dials[offer.country])$('dial-code').value=dials[offer.country];
      all('.coupon').forEach(el=>el.hidden=!offer.allowCoupons);
      if(!sessionId){const cached=read(attemptKey);if(cached?.sessionId){sessionId=cached.sessionId;const url=new URL(location.href);url.searchParams.set('session_id',sessionId);history.replaceState(null,'',url);}}
      if(sessionId)await checkStatus(true);else{await createSession();await mount(session.clientSecret);}
    }catch{show('No se pudo cargar el pago. Inténtalo otra vez.',true);$('stripe-placeholder').textContent=t('El pago todavía no está habilitado.');$('retry-payment').hidden=false;}
    finally{busy=false;controls();}
  }
  start();
})();
