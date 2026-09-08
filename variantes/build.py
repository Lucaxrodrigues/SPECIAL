from pathlib import Path
from lxml import html,etree
import re,json
BASE=Path(__file__).resolve().parent
OUT=BASE.parent/'dist'
COPY=json.loads((BASE/'copy.json').read_text())
def el(s):return html.fragment_fromstring(s)
def replace(node,new):node.getparent().replace(node,new)
def cls(tree,c):return tree.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," '+c+' ")]')
def consent(extra=False):
 ident='terms-express' if extra else 'terms'
 saveid='save-express' if extra else 'save-card'
 return f'''<div class="consents"><label for="{ident}"><input id="{ident}" class="terms-box" type="checkbox" {'required' if not extra else ''}><span>Acepto los <a href="terminos.html" target="_blank" rel="noopener">Términos de compra</a> y la <a href="reembolsos.html" target="_blank" rel="noopener">Política de reembolso</a>.</span></label><label for="{saveid}"><input id="{saveid}" class="save-card" type="checkbox"><span>Guardar mi tarjeta para futuras compras que yo confirme. Es opcional y no autoriza cargos automáticos.</span></label><p>Consulta cómo usamos tus datos en la <a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>.</p></div>'''
conditions='''<section class="condition-box"><p><strong>Garantía comercial de 60 días</strong><br>Devolución íntegra del kit solicitada dentro de los 60 días naturales desde la entrega efectiva del acceso, sin necesidad de justificar el motivo. Se preservan tus derechos legales.</p><p><strong>Entrega y acceso</strong><br>Descarga por correo y acceso al área privada en hasta 24 horas después de confirmar el pago. Acceso sin fecha de vencimiento.</p><p>Producto digital en español · Sin suscripción ni renovación automática.</p></section>'''
footer='''<footer class="company-footer"><nav aria-label="Políticas"><a href="terminos.html" target="_blank" rel="noopener">Términos de compra</a><a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a><a href="reembolsos.html" target="_blank" rel="noopener">Política de reembolso</a><a href="entrega.html" target="_blank" rel="noopener">Entrega y acceso</a><a href="contacto.html" target="_blank" rel="noopener">Soporte</a></nav><p>Políticas disponibles en español.</p><p><strong>Dropix Editora e Marketing Ltda.</strong> · CNPJ: 65.255.590/0001-49<br>Rua Antonio Basil Schroeder, 37, Barreiros, São José, Santa Catarina, CEP 88110-400, Brasil.</p><p><a href="mailto:guiasuporteoficial@gmail.com">guiasuporteoficial@gmail.com</a> · <a href="https://wa.me/5519999962986" target="_blank" rel="noopener noreferrer">WhatsApp: +55 19 99996-2986</a><br><span>08:00–18:00, hora de Nueva York. Respuesta en hasta 24 horas.</span></p></footer>'''
coupon='''<details class="coupon" hidden><summary>¿Tienes un cupón?</summary><div class="coupon-row"><label class="sr-only" for="coupon-code">Código de cupón</label><input id="coupon-code" maxlength="80" autocomplete="off" placeholder="Código de cupón"><button id="apply-coupon" type="button" class="btn btn-dark" disabled>Aplicar</button><button id="remove-coupon" type="button" class="btn" hidden>Quitar cupón</button></div><p id="coupon-message" class="coupon-message" role="status"></p></details>'''
for variant in 'abcde':
 root=html.fromstring((BASE/'templates'/f'checkout-{variant}.html').read_text())
 head=root.find('head');body=root.find('body');form=body.xpath('.//form')[0]
 head.find('title').text='Alfa Max · Compra';root.set('lang','es-419')
 for meta in ['<meta name="robots" content="noindex,nofollow">','<meta name="referrer" content="strict-origin-when-cross-origin">','<meta name="description" content="Alfa Max: kit digital de organización doméstica y semanal. Pago único, garantía comercial de 60 días.">']:head.append(el(meta))
 for n in body.xpath('.//script|.//footer'):n.getparent().remove(n)
 for n in body.xpath('.//*[@onclick]'):n.attrib.pop('onclick',None);n.set('data-step','details-step')
 for n in body.xpath('.//*[@data-payment-choice]'):
  n.attrib.pop('data-payment-choice',None);n.clear();n.set('class','payment-choice');n.text='Pago seguro'
 for n in cls(root,'secure'):n.clear();n.set('class','secure');n.text='Pago procesado por Stripe. Los datos de tarjeta se envían directamente a Stripe.'
 # Remove the old nonfunctional coupon section.
 for title in body.xpath('.//h2'):
  if title.text=='Cupón':title.getparent().getparent().remove(title.getparent())
 # Personal fields keep their positions, with proper labels, autocomplete and IDs.
 counters={'email':0,'name':0,'phone':0}
 for field in cls(root,'field'):
  inputs=field.xpath('.//input')
  if not inputs:continue
  inp=inputs[0];label=field.xpath('.//label')[0];old=''.join(label.itertext()).strip().lower()
  kind='email' if ('correo'in old or'email'in old) else 'phone' if ('teléfono'in old or 'phone'in old) else 'name'
  counters[kind]+=1;ident='customer-'+kind+('2' if counters[kind]>1 else '')
  inp.set('id',ident);inp.set('name',ident);label.set('for',ident)
  inp.set('autocomplete',{'email':'email','name':'name','phone':'tel-national'}[kind]);inp.set('maxlength',{'email':'254','name':'150','phone':'30'}[kind])
  label.text={'email':'Confirmar correo electrónico' if counters[kind]>1 else 'Correo electrónico','name':'Nombre completo','phone':'Teléfono (opcional)'}[kind]
  if kind=='phone':inp.set('type','tel');inp.attrib.pop('required',None);inp.set('placeholder','Número de teléfono')
  elif kind=='email':inp.set('type','email');inp.set('placeholder','Repite tu correo' if counters[kind]>1 else 'correo@ejemplo.com')
  else:inp.set('placeholder','Tu nombre')
  inp.set('data-customer','true')
  for select in field.xpath('.//select'):
   select.clear();select.set('aria-label','Código de país');select.set('id','dial-code')
   for code in ['+54','+598','+52','+57','+56','+51','+34','+1','+55','+591','+595','+506','+502','+504','+505','+507','+503']:
    op=etree.SubElement(select,'option',value=code);op.text=code
 # Real Element container, placeholder visible only before connection.
 stripebox=cls(root,'stripe-box')[0];stripebox.clear();stripebox.set('class','stripe-box');stripebox.set('id','payment-step')
 stripebox.append(el('<p id="stripe-placeholder" class="loading-text">El pago todavía no está habilitado.</p>'))
 stripebox.append(el('<div id="stripe-payment-element"></div>'))
 stripebox.append(el('<div id="billing-address" class="address-block" hidden><h3 class="section-title">Dirección de facturación</h3><div id="stripe-billing-address"></div></div>'))
 stripebox.addprevious(el(coupon))
 if variant=='a':cls(root,'coupon')[0].attrib.pop('hidden',None)
 # Replace media pickers with owner-configurable, non-interactive visitor slots.
 slots={}
 for i,slot in enumerate(cls(root,'slot'),1):
  text=' '.join(slot.itertext()).lower();kind='testimonial' if('testimonio'in text or'depoimento'in text) else 'video' if 'video'in text or slot.get('data-slot-file')=='video/*' else 'image'
  key=f'media{i}';slots[key]={'kind':kind,'src':'','alt':'','poster':'','text':'','author':'','verified':False}
  slot.attrib.pop('data-slot-file',None)
  for child in list(slot):slot.remove(child)
  slot.text=None;slot.set('data-media-slot',key);slot.set('class',slot.get('class','slot')+' media-preview')
  slot.append(el('<strong>'+{'image':'Ejemplo visual · Imagen','video':'Ejemplo visual · Video','testimonial':'Espacio para un testimonio real'}[kind]+'</strong>'))
  slot.append(el('<span>'+('Vista previa de ubicación; no es un testimonio de cliente.' if kind=='testimonial' else 'Espacio de medios sin contenido publicado.')+'</span>'))
 # Clean the editorial note in D: placeholders remain explicitly labelled in preview.
 for n in list(cls(root,'legal')):
  if n.get('data-status') is not None:continue
  if 'Los testimonios' in ''.join(n.itertext()):n.getparent().remove(n)
 # Proper payment action and summary bound to the same session total in every layout.
 pay=form.xpath('.//button[@type="submit"]')[0];pay.clear();pay.set('id','pay-button');pay.set('class','btn btn-primary btn-block');pay.set('type','submit');pay.set('disabled','disabled');pay.text='Pagar ';pay.append(el('<span data-money="total">USD 27.00</span>'))
 pay.addprevious(el(consent()))
 pay.addprevious(el('<p class="pay-total">Total: <strong data-money="total">USD 27.00</strong></p>'))
 status=form.xpath('.//*[@data-status]')[0];status.clear();status.set('id','payment-status');status.set('role','status');status.set('aria-live','polite');status.set('class','state-panel')
 status.addnext(el('<button id="retry-payment" type="button" class="btn" hidden>Volver a intentar</button>'))
 status.addnext(el('<button id="new-payment" type="button" class="btn" hidden>Iniciar otra sesión</button>'))
 form.addnext(el(conditions))
 # The E layout retains its express position; the button is supplied by Stripe when eligible.
 if variant=='e':
  btn=body.xpath('.//button[contains(text(),"Apple Pay")]')[0]
  shell=el('<section id="express-shell" class="express-shell"><div class="preview-only"><button class="btn btn-dark btn-block" type="button" disabled>Pago rápido · vista previa</button></div><div id="express-live" hidden>'+consent(True)+'<p class="legal" id="express-hint">Acepta las condiciones para habilitar el pago rápido.</p><div id="stripe-express-element" class="express-mount disabled-wallet" inert></div></div></section>')
  replace(btn,shell)
  if shell.getnext() is not None:shell.getnext().set('id','express-divider')
  for n in body.iter():
   if n.text and n.text.strip()in ['Express checkout','OR','Card']:
    n.text={'Express checkout':'Pago rápido','OR':'O','Card':'Tarjeta'}[n.text.strip()]
 # Live navigable section indicators for C; preserve its visible two-column composition.
 if variant=='c':
  twocol=cls(root,'two-col')[0];twocol[0].set('id','order-step');form[0].set('id','details-step')
  nav=cls(root,'three-step')[0]
  for index,item in enumerate(list(nav)):
   item.tag='button';item.set('type','button');item.set('data-step',['order-step','details-step','payment-step'][index]);item.set('aria-current','step' if index==0 else 'false')
 # Every literal amount is annotated once. JS replaces these with actual session values.
 for n in list(body.iter()):
  if n.text and re.fullmatch(r'\$27(?:\.00)?',n.text.strip()):
   n.text='USD 27.00';n.set('data-money','total' if n.getparent()is not None and 'total'in n.getparent().get('class','') else 'base')
  if n.text and n.text.strip()=='Calculados por Stripe':n.text='Incluidos en el total cuando corresponda'
 # Common small controls above the unmodified original page silhouette.
 toolbar=el('''<div class="toolbar"><a href="index.html">Volver al kit</a><label for="language">Idioma <select id="language"><option value="es">Español</option><option value="pt">Português</option><option value="en">English</option></select></label><label for="currency">Moneda <select id="currency" disabled><option value="usd">USD</option></select></label><small>Cambiar idioma o moneda vuelve a cargar el formulario de pago.</small></div>''')
 body.insert(0,toolbar);body.insert(0,el('<div id="mode-banner" class="mode-banner">Vista previa · Pagos desactivados</div>'))
 body.append(el(footer));body.append(el('<noscript><p class="state-panel">Activa JavaScript para pagar. Los contactos y las políticas siguen disponibles.</p></noscript>'))
 css=etree.SubElement(head,'style');css.text=(BASE/'extra.css').read_text()+'\n.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}'
 config={'enabled':False,'publishableKey':'','apiBaseUrl':'','expectedMode':'test','variant':variant,'defaultLanguage':'es','showMediaPreview':True,'media':slots}
 script=etree.SubElement(body,'script');script.text='\n// CONFIGURAÇÃO PÚBLICA. Segredos ficam exclusivamente no Worker.\nconst CHECKOUT_CONFIG = '+json.dumps(config,ensure_ascii=False,indent=2)+';\nconst TRANSLATIONS = '+json.dumps(COPY,ensure_ascii=False,separators=(',',':'))+';\n'+(BASE/'checkout.js').read_text()
 (OUT/f'checkout-{variant}.html').write_text('<!doctype html>\n'+html.tostring(root,encoding='unicode',method='html'))
 print(f'Built {variant}: {len(slots)} media slots')
