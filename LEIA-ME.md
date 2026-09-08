# Alfa Max — site e checkouts A–E

Comece por **CHECKOUT-LEIA-ME.md** para configurar pagamentos, moedas, idiomas e mídias.

## Arquivos para o GitHub

Publique na mesma pasta pública:

- index.html: página de vendas.
- checkout.html: entrada que encaminha ao checkout A, preservando os parâmetros da URL.
- checkout-a.html até checkout-e.html: cinco layouts, todos com CSS, traduções e JavaScript próprios dentro do HTML.
- terminos.html, privacidad.html, reembolsos.html, entrega.html, contacto.html: políticas e suporte.
- politicas.css: necessário para a página de vendas e as políticas; os cinco checkouts independem dele.

Preserve seu CNAME e faça backup do site atual antes da substituição. As mídias que adicionar precisam acompanhar os caminhos indicados no HTML. A pasta integracao/ contém o Worker comum aos cinco modelos, para publicar na Cloudflare. Não cole o código em DNS. variantes/ contém fontes e testes para manutenção; não é necessária no site público.

## Estado da entrega

O código de pagamento está implementado, mas a configuração vem desativada. Faltam os dados da sua conta Stripe e a publicação do Worker, seguidos dos testes de integração descritos no guia. Não existem segredos no pacote. Os cinco layouts não precisam de tradutor externo: espanhol, português e inglês já estão incluídos; o produto e as políticas continuam em espanhol.

A entrega por e-mail/download e área privada será administrada pelo proprietário via n8n. O pacote não implementa envio, armazenamento de PDFs, autenticação de alunos nem upsells. Não modifica webhooks existentes.

## Dados e condições incluídos

Dropix Editora e Marketing Ltda. · CNPJ 65.255.590/0001-49. Endereço: Rua Antonio Basil Schroeder, 37, Barreiros, São José, Santa Catarina, CEP 88110-400, Brasil. Dados transcritos conforme fornecidos pelo proprietário, sem certificação cadastral.

Suporte: guiasuporteoficial@gmail.com e WhatsApp +55 19 99996-2986. Atendimento 08:00–18:00 em America/New_York; prazo máximo de resposta de 24 horas corridas. Entrega em até 24 horas corridas após confirmação do pagamento. Acesso sem vencimento e sem renovação paga. Garantia comercial de 60 dias corridos desde a entrega efetiva do acesso, com reembolso integral do kit e preservação dos direitos legais aplicáveis.

## Pendências comerciais preservadas

A página principal e as políticas continuam marcadas como versão de revisão. Produza o conteúdo anunciado, confirme os fornecedores de entrega e acesso, organize o atendimento e revise os requisitos dos mercados realmente atendidos. As traduções do checkout não significam habilitação de venda em todos os países nem aprovação pela Stripe. Noindex não torna as páginas privadas.

As opções de reembolso abrem e-mail ou WhatsApp; não geram automaticamente um protocolo de solicitação. A implementação jurídica final, retenção de dados e eventuais mecanismos próprios exigidos por mercado ainda dependem da operação real.

Verificação realizada e limitações de teste estão em CHECKOUT-LEIA-ME.md.
