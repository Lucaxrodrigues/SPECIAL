# Alfa Max — cinco checkouts integrados

## O que foi entregue

Os arquivos checkout-a.html até checkout-e.html preservam a estrutura, a paleta e o CSS original dos cinco modelos enviados. Cada HTML contém seus próprios estilos, traduções e JavaScript. Nenhuma folha de estilos externa é necessária nesses cinco arquivos. O formulário seguro carrega exclusivamente o script oficial da Stripe.

- A: coluna única, produto no topo, cupom recolhido e mídia abaixo.
- B: formulário à esquerda e resumo persistente à direita no desktop; no celular, o total também aparece junto do botão de pagamento.
- C: composição original com indicador e navegação entre as seções pedido, dados e pagamento; as seções permanecem visíveis, sem simular telas ocultas inexistentes.
- D: banner, mídia e prova social em posições promocionais.
- E: espaço de pagamento rápido substituído pelo Express Checkout real da Stripe, exibido quando há métodos elegíveis. Os termos precisam ser aceitos antes de habilitar as carteiras.

As páginas chegam em prévia, com pagamentos desativados porque ainda faltam chaves públicas, Price ID e o Worker publicado. Não houve conexão com sua conta, pagamento real ou publicação externa. A entrega pelo n8n continua inteiramente com você.

`checkout.html` preserva a URL principal e encaminha para o modelo A. Os links de compra do index.html continuam funcionando. Cada outro modelo tem sua própria URL. Opcionalmente, `checkout.html?variant=b` encaminha ao B. Não existe sorteio ou distribuição automática de tráfego. O parâmetro `variant` gravado na sessão e no PaymentIntent identifica a origem de cada compra; os parâmetros UTM vão para a sessão. Isso não instala Meta Pixel, CAPI ou Utmify.

## Ativação em teste

1. Publique os HTMLs, as cinco páginas de políticas e `politicas.css` na mesma pasta pública do GitHub. Preserve seu CNAME. A página principal e as políticas ainda usam politicas.css; os cinco checkouts não dependem dele.
2. Na Stripe de teste, use **um único Price ID com várias moedas**, correspondente ao Alfa Max. A opção USD deve ser de 27,00. O preço-base pode estar em BRL: o Worker lê também `currency_options` e valida a opção USD. Não use cinco produtos ou cinco preços para o mesmo teste de layout.
3. Publique `integracao/worker.js` na Cloudflare e configure as variáveis abaixo. O arquivo wrangler.jsonc permite publicar com Wrangler e inclui limitação básica de requisições. Se publicar pelo painel, configure as variáveis e o controle de abuso equivalentes.
4. Em cada HTML, perto do final, edite somente a configuração pública `CHECKOUT_CONFIG`: `enabled: true`, sua `publishableKey` que começa com `pk_test_`, `apiBaseUrl` com a URL HTTPS do Worker sem barra final e `expectedMode: "test"`. Mantenha a letra `variant` de cada arquivo. Nenhum segredo entra no HTML.
5. Abra pelo domínio HTTPS. Duplo clique no HTML serve para ver o layout e trocar o idioma, mas não para processar pagamentos. O checkout exibirá o aviso de teste.

### Variáveis do Worker

| Variável | Valor |
| --- | --- |
| SITE_ORIGIN | https://dropixeditoralivros.com — ajuste ao domínio canônico real, sem barra final |
| SITE_PATH_PREFIX | Vazio quando os HTMLs ficam na raiz; exemplo `/loja` se estiverem em uma subpasta |
| ALFA_MAX_PRICE_ID | Seu price_... de teste, com moedas manuais e USD 27,00 |
| FALLBACK_CURRENCY | usd |
| ALLOW_LIVE_PAYMENTS | false |
| AUTOMATIC_TAX_ENABLED | false inicialmente; configure suas obrigações fiscais antes de vender |
| ALLOW_PROMOTION_CODES | false; use true quando tiver cupons reais configurados e testados |
| ALLOWED_CURRENCIES | Opcional: lista por vírgulas para limitar as opções publicadas, por exemplo `usd,ars,uyu,mxn,eur`; omitida, utiliza as opções válidas do Price |
| STRIPE_API_VERSION | Opcional: versão da API da Stripe que você tenha validado com esta integração |

Cadastre **como Secrets**, somente no Worker:

- STRIPE_SECRET_KEY: chave secreta de teste da mesma conta/produto. Pode ser uma chave restrita com as permissões compatíveis.
- CHECKOUT_TOKEN_SECRET: segredo aleatório próprio com pelo menos 32 caracteres, gerado por um gerenciador de senhas. Serve para assinar a consulta do pedido.

Não coloque esses segredos em DNS, arquivos públicos ou mensagens. O Worker pode usar seu endereço workers.dev sem transferir o DNS do site. O domínio com www e sem www são origens diferentes; SITE_ORIGIN precisa corresponder ao endereço realmente usado pelo comprador.

Esta versão usa Stripe Checkout Sessions com Payment Element (`ui_mode: elements`). Substitui o backend do checkout embutido completo da versão anterior. Não misture JavaScript novo com o Worker anterior.

## Moedas manuais, Argentina e idioma

O servidor consulta os valores cadastrados no Price; não consulta cotação e não calcula câmbio. Identifica o país aproximado pela conexão recebida pela Cloudflare e escolhe a moeda correspondente quando há uma opção cadastrada: por exemplo AR → ARS, UY → UYU, MX → MXN, ES → EUR. Se não houver correspondência, usa USD. A lista de correspondências fica em COUNTRY_CURRENCY no Worker e pode ser estendida. O comprador também pode selecionar uma das moedas habilitadas.

ARS só aparece se existir entre as opções válidas do seu Price/conta. Uma VPN pode alterar o país detectado, mas não cria suporte a uma moeda ausente. O servidor passa explicitamente a moeda escolhida à sessão. Adaptive Pricing está desativado no servidor e no SDK. Não aparece um cálculo comparativo entre reais e outra moeda feito pelo nosso código. BRL pode aparecer como opção de cobrança se estiver entre as moedas publicadas; use ALLOWED_CURRENCIES se quiser restringir os mercados da oferta.

Os totais vêm do objeto de sessão da Stripe e se atualizam após cupom ou imposto. O resumo não fica preso em 27 dólares quando o cliente paga em outra moeda. Preços manuais precisam de manutenção por você quando quiser alterá-los. O banco pode cobrar suas próprias tarifas/conversão.

Espanhol é o idioma inicial. O seletor oferece português e inglês com traduções locais, sem API de tradução, fontes externas ou bibliotecas adicionais. Salva apenas essa preferência em localStorage. Também aceita `?lang=es`, `?lang=pt` ou `?lang=en`. O produto continua em espanhol e isso fica explícito em todas as versões. As páginas de políticas permanecem em espanhol, com esse aviso no rodapé.

Mudar idioma ou moeda com uma sessão aberta expira essa sessão antes de criar outra e recarrega o formulário; dados digitados precisam ser preenchidos novamente. Se o pagamento tiver terminado enquanto isso, o código consulta o resultado e não cria outra compra automaticamente.

## Imagens, vídeos e depoimentos

O objeto `media` dentro de cada HTML possui media1, media2 etc., na ordem dos espaços daquele modelo. Edite cada entrada correspondente:

- Imagem: mantenha `kind: "image"`, preencha `src: "imagens/banner.webp"` e uma descrição em `alt`.
- Vídeo: use `kind: "video"`, `src: "videos/apresentacao.mp4"` e, opcionalmente, `poster: "imagens/capa.webp"`. Vídeos têm controles, não iniciam automaticamente e usam `preload: none`.
- Depoimento: `kind: "testimonial"`, preencha `text` e `author`, foto opcional em `src`, e marque `verified: true` somente para um depoimento real que você possa publicar. Para depoimento em vídeo, use um espaço de vídeo com seu arquivo real. Revise direitos/autorização do conteúdo antes da publicação.

Publique as mídias nos caminhos indicados. CSS interno não significa que vídeos precisem ficar codificados dentro do HTML. Os espaços sem conteúdo aparecem apenas na prévia; com `enabled: true`, somem. Não há seletor de arquivos para visitantes, upload ao servidor ou player de vídeo fictício. Não há JivoChat.

## Condições e segurança implementadas

Links funcionais para termos, privacidade, reembolso, entrega e contato; empresa, CNPJ, endereço e suporte fornecidos; garantia comercial de 60 dias desde a entrega efetiva; entrega em até 24 horas após pagamento confirmado; acesso sem vencimento e ausência de assinatura. Esses compromissos precisam ser cumpridos pela operação.

O checkbox dos termos não vem marcado. O servidor registra versão, idioma e momento do aceite na sessão Stripe. Salvar cartão é outra escolha, também desmarcada, enviada ao SDK como savePaymentMethod. Isso não implementa nem autoriza upsells automáticos; futuras ofertas precisam de confirmação própria.

Preço e quantidade são controlados pelo servidor. Consultar ou expirar uma sessão exige token específico assinado, válido por 48 horas. Abrir a confirmação em outro navegador pode exigir contato com suporte. A interface não libera arquivos e não usa somente a URL para afirmar que houve pagamento. Os dados de cartão ficam no formulário da Stripe. Mensagens de erro retornadas pela Stripe são exibidas como texto, nunca como HTML.

O wrangler.jsonc contém um limite inicial de 300 requisições por minuto por IP/localidade da Cloudflare. É um controle básico, não substitui medidas antifraude. Ajuste observando o tráfego: usuários de redes móveis podem compartilhar IP. O namespace 1001 deve ser exclusivo nessa conta se você não quiser compartilhar contadores com outro Worker. CORS não é autenticação. Compras separadas em dispositivos ou variantes diferentes não são deduplicadas globalmente.

Se habilitar Stripe Tax, configure primeiro registros, categoria fiscal e comportamento tributário dos preços. O formulário acrescenta o Address Element para os dados necessários e acompanha o total atualizado. A variável false não significa isenção tributária.

## Verificação e passagem para produção

Foram verificados sintaxe, IDs, vínculos de labels, URLs locais, tradução dos textos fixos e ausência de CSS externo nos cinco HTMLs. O primeiro bloco CSS foi preservado byte a byte em relação a cada modelo original; ajustes responsivos e de acessibilidade ficam no segundo bloco interno.

Testes isolados com Stripe e DOM simulados passaram para os cinco modelos: inicialização, tradução em prévia, totais/cupom, aceite, comparação de e-mails, opção de salvar cartão, confirmação e bloqueio de nova tentativa quando o resultado é incerto. O backend foi testado para moedas, preço-base BRL com USD 27, fallback USD, validação, tokens, expiração, idempotência e corrida entre expirar sessão e pagamento concluído. Testes estão em variantes/tests/.

Não houve teste visual em navegador, compra real, autenticação bancária real ou verificação das carteiras na sua conta. Conecte o ambiente de teste e confira: aprovação, recusa, 3DS, moeda/país, idioma, cupom, ausência de carteira, termos e recarregamento. Os cartões de teste oficiais estão na documentação da Stripe. Confira o pagamento e os metadados no painel, separadamente da automação n8n que você administra.

Depois disso, troque Price ID/chaves pelo ambiente de produção, use expectedMode: live nos HTMLs e ALLOW_LIVE_PAYMENTS: true no Worker. Registre o domínio de pagamento na Stripe para as carteiras, nos ambientes de teste e produção. Ajuste informações públicas e recibos no painel. Finalize produto e revisão dos mercados antes de remover os avisos de revisão das páginas de vendas/políticas. O pacote não constitui aprovação da Stripe.

## Manutenção

O navegador só precisa dos HTMLs publicados. A pasta variantes/ guarda fontes para manutenção consistente: templates originais, copy.json, checkout.js, extra.css e build.py. O gerador usa Python com lxml e incorpora tudo nos HTMLs; essas fontes não são dependências de execução do site. Se editar um HTML diretamente e depois rodar build.py, suas edições serão sobrescritas; prefira atualizar a fonte/configuração correspondente antes de regenerar.

Referências: [Checkout personalizado](https://docs.stripe.com/payments/quickstart), [ações e confirmação](https://docs.stripe.com/js/custom_checkout), [Express Checkout](https://docs.stripe.com/elements/express-checkout-element), [preços por moeda](https://docs.stripe.com/products-prices/manage-prices), [checklist de site](https://docs.stripe.com/get-started/checklist/website), [limitação de requisições](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
