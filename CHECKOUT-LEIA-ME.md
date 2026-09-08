# Checkout Alfa Max — ativação

A página está em `checkout.html`. Todo o CSS e o JavaScript da página estão dentro desse HTML. Não precisa de `politicas.css` para manter seu design. O formulário de cartão é inserido pelo script oficial da Stripe, que deve continuar carregado diretamente de `js.stripe.com`; não copie esse script para o GitHub.

O pacote vem com pagamentos desativados. Já contém a integração, mas ainda faltam as configurações da sua conta e a publicação do Worker. Não foi realizado pagamento na sua Stripe.

## 1. Publicar os arquivos do site

Faça backup do site atual. Envie os sete HTML e `politicas.css` para a mesma pasta publicada pelo GitHub Pages. Preserve seu `CNAME`. A URL será `https://dropixeditoralivros.com/checkout.html` se esse for o domínio configurado no GitHub.

A página principal e as políticas continuam usando `politicas.css`. Apenas o novo checkout é independente desse arquivo. `integracao/` contém código para Cloudflare, não é um arquivo de design nem código para colar no DNS. Os documentos `.md` são instruções para você.

## 2. Preparar a Stripe em teste

Crie ou localize o produto Alfa Max no ambiente de testes, com nome e descrição em espanhol e um preço de US$ 27,00, pagamento único. Copie o **Price ID** (`price_...`). O ID do produto (`prod_...`) e o link de pagamento não substituem esse dado. Produtos e chaves de teste são diferentes dos de produção.

Nas informações públicas/Checkout da Stripe, configure as URLs públicas de `terminos.html`, `privacidad.html` e os contatos. A sessão exige aceite dos termos; a URL de termos precisa estar configurada na conta. Ajuste também a identidade visual do formulário nativo da Stripe: seu CSS não atravessa o iframe. Use a marca Alfa Max e confira como o nome da empresa aparece no pagamento e no recibo.

## 3. Publicar o Worker de pagamento

No Cloudflare Workers, crie um Worker JavaScript e use o conteúdo de `integracao/worker.js`. Configure estas variáveis nas configurações do Worker:

| Nome | Valor |
| --- | --- |
| `SITE_ORIGIN` | `https://dropixeditoralivros.com` — ajuste se seu endereço canônico for outro; sem barra final |
| `CHECKOUT_RETURN_URL` | `https://dropixeditoralivros.com/checkout.html` — mesmo domínio |
| `ALFA_MAX_PRICE_ID` | Seu `price_...` de teste, US$ 27, pagamento único |
| `ALLOW_LIVE_PAYMENTS` | `false` |
| `AUTOMATIC_TAX_ENABLED` | `false` inicialmente; veja a observação fiscal abaixo |

Cadastre **como Secrets**, exclusivamente no Worker:

- `STRIPE_SECRET_KEY`: chave secreta do mesmo ambiente de teste da Stripe. Uma chave restrita compatível pode ser usada se tiver as permissões necessárias.
- `CHECKOUT_TOKEN_SECRET`: segredo aleatório exclusivo com pelo menos 32 caracteres, gerado por um gerenciador de senhas. Assina a autorização de consulta do pedido; não é uma chave da Stripe.

Não coloque esses segredos no HTML, no repositório nem em registros DNS. Não é necessário enviá-los por mensagem. Se usar Wrangler, o arquivo `integracao/wrangler.jsonc` contém as variáveis públicas equivalentes; os segredos continuam configurados separadamente.

Copie a URL HTTPS do Worker publicado. O endereço `workers.dev` pode ser usado sem transferir o DNS do seu site. CORS permite somente o domínio exato de `SITE_ORIGIN`; `www` e domínio sem `www` são origens distintas. Padronize o endereço pelo qual o comprador acessa o site.

## 4. Conectar o HTML

No final de `checkout.html`, preencha o bloco:

```js
const CHECKOUT_CONFIG = Object.freeze({
  enabled: true,
  publishableKey: 'SUA_CHAVE_PUBLICA_DE_TESTE',
  apiBaseUrl: 'URL_HTTPS_DO_WORKER_SEM_BARRA_FINAL',
  expectedMode: 'test'
});
```

A chave pública começa com `pk_test_`. Republique o HTML. Abra a página pela URL HTTPS do site; abrir o arquivo por duplo clique mostra o design, mas não ativa pagamentos. Em teste, a página exibe um aviso visível de que não existem cobranças reais.

## 5. Conferir antes de ativar vendas

Use exclusivamente cartões de teste no ambiente de teste: `4242 4242 4242 4242` para aprovação, `4000 0025 0000 3155` para autenticação 3DS e `4000 0000 0000 9995` para recusa, com validade futura e CVC de teste. Confira pedido, moeda e estado no painel da Stripe. Verifique também termos, opção voluntária de salvar cartão, recusa, retorno da autenticação e retomada após falha de conexão. A página não deve afirmar sucesso quando o pagamento está pendente.

O Worker tem dois endpoints: `POST /checkout/session` e `POST /checkout/status`. A consulta exige um token específico do pedido, mantido na sessão do navegador. Abrir a URL de confirmação em outro navegador pode exigir contato com suporte. Uma resposta `200` isolada não comprova pagamento: a interface exige sessão concluída e pagamento efetivamente pago.

O código valida no servidor preço, moeda, quantidade e modo. Repete a mesma chave de idempotência para um mesmo intento. Não aceita preço, URL de retorno, Customer ID ou cartão enviados arbitrariamente pelo navegador. CORS não é autenticação nem controle contra robôs: configure limites de requisições/controle de abuso adequados antes de expor a operação comercial. Não há garantia de evitar compras duplicadas intencionais em abas ou dispositivos diferentes.

Se a Stripe rejeitar a sessão, os registros do Worker mostram apenas código/tipo de erro e o identificador da requisição; consulte esse identificador nos logs da Stripe. Confira Price ID, ambiente, permissões e URL dos termos. O código segue os parâmetros atuais da documentação; valide a versão da API usada na conta antes de produção. `STRIPE_API_VERSION` é uma variável opcional para fixar uma versão compatível já validada.

## Escopo desta integração

- US$ 27 em USD, cartão, quantidade 1, sem recorrência; conversão automática de preços desativada nesta versão. A moeda e possíveis taxas do banco estão explicadas na página.
- Opção nativa e voluntária de salvar cartão para compras futuras. Não implementa os upsells nem autoriza cobranças extras: cada futura oferta precisará de confirmação própria.
- Preserva os cinco parâmetros UTM no caminho da página principal ao checkout e nos metadados da sessão. Isso não equivale à integração Utmify, Meta Pixel ou CAPI.
- Confirmação visual do pagamento na própria `checkout.html`. Não envia e-mail, não fornece PDFs e não implementa login. A entrega automática pelo n8n fica com você, separadamente.
- Não altera webhooks existentes. A confirmação no navegador não deve ser usada como prova para liberar arquivos; a sua automação de entrega permanece independente desta interface.

## Passagem para produção

Após os testes e a conclusão do produto e das condições comerciais, substitua Price ID e chaves pelos equivalentes de produção, use `expectedMode: 'live'` no HTML e `ALLOW_LIVE_PAYMENTS: 'true'` no Worker. Confira os dados públicos, os países realmente atendidos e a cobrança final antes de remover os avisos de revisão da página principal e das políticas. Os avisos atuais não são autorização para anunciar uma oferta ainda incompleta.

Tributos não foram determinados neste pacote. `AUTOMATIC_TAX_ENABLED=false` não dispensa obrigações fiscais. Se for utilizar Stripe Tax, configure o cadastro fiscal e o comportamento tributário do preço, habilite a variável e teste o total final exibido antes da confirmação. Um imposto adicional deve ficar claro antes de pagar.

## Verificação deste pacote

Links e sintaxe verificados localmente. Testes isolados do Worker com respostas simuladas cobrem preço, autenticação da consulta, estados e bloqueio de produção não habilitada. Não houve teste visual em navegador, conexão com sua conta Stripe ou publicação na Cloudflare/GitHub.

Referências: [Checkout embutido](https://docs.stripe.com/checkout/embedded/quickstart), [salvar cartão com consentimento](https://docs.stripe.com/payments/checkout/save-during-payment?payment-ui=embedded-page), [confirmação e redirecionamento](https://docs.stripe.com/payments/checkout/custom-success-page?payment-ui=embedded-page), [Secrets do Cloudflare Workers](https://developers.cloudflare.com/workers/configuration/secrets/).
