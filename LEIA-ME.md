# Alfa Max — site e políticas em páginas próprias

Atualização de 8 de setembro de 2026.

## Arquivos do pacote
- index.html: página de venda em espanhol, com demonstração interativa.
- politicas.css: estilos compartilhados. É obrigatório enviar este arquivo junto dos HTML.
- terminos.html: termos de compra e uso.
- privacidad.html: privacidade.
- reembolsos.html: reembolsos e desistimento.
- entrega.html: entrega e acesso.
- contacto.html: contatos e atendimento.

## Checkout embutido — atualização

A nova `checkout.html` tem CSS e JavaScript internos. Os botões de compra levam até ela. O pacote inclui o Worker de pagamento em `integracao/`; siga `CHECKOUT-LEIA-ME.md` para conectar Stripe e Cloudflare. Pagamentos continuam desativados até a configuração. A entrega pelo n8n é administrada pelo proprietário.

## Como conferir e publicar uma prévia no GitHub
1. Extraia todos os arquivos na mesma pasta.
2. Abra index.html no navegador.
3. Faça backup dos arquivos atuais do seu site.
4. Envie os sete HTML e politicas.css à pasta publicada pelo GitHub Pages.
5. Preserve o arquivo CNAME do seu domínio, caso exista.
6. Confirme que os links das políticas abrem e que os estilos aparecem.

Não exige npm ou framework. A página principal e as políticas dependem de politicas.css. A nova checkout.html tem design independente, totalmente dentro do arquivo. LEIA-ME.md é instrução para o proprietário, não uma página jurídica.

## Informações incluídas — atualização cadastral
- Empresa: Dropix Editora e Marketing Ltda., Brasil.
- CNPJ: 65.255.590/0001-49.
- Endereço: Rua Antonio Basil Schroeder, 37, Barreiros, São José, Santa Catarina, CEP 88110-400, Brasil. Dados transcritos conforme fornecidos; não foram certificados em consulta cadastral.
- E-mail: guiasuporteoficial@gmail.com.
- WhatsApp: +55 19 99996-2986; link internacional https://wa.me/5519999962986.
- Atendimento: 08:00 a 18:00, hora de Nova York (America/New_York), acompanhando as mudanças sazonais.
- Prazo máximo de resposta: 24 horas corridas desde o recebimento da mensagem. Não foi acrescentada restrição a dias úteis.
- Prazo máximo de entrega: 24 horas corridas após confirmação do pagamento.
- Garantia comercial: 60 dias corridos após disponibilização efetiva do acesso ao Alfa Max; devolução integral do valor pago pelo kit, sem exigir justificativa ou prova de conclusão. O marco inicial foi adotado como decisão de redação e está explícito na página.
- Entrega prevista: link de download por e-mail e área privada no próprio site.
- Acesso: sem data de vencimento e sem renovação paga, conforme solicitado.
- Público: hispanofalantes, com mercados sujeitos às restrições legais e da Stripe.

Os contatos são os fornecidos pelo proprietário; não foi enviado e-mail nem mensagem para verificar sua operação.

## Status comercial e técnico
As políticas são rascunhos detalhados para revisão. Não representam aprovação da Stripe nem certificação de conformidade mundial. Os botões de compra abrem checkout.html, mas a cobrança permanece desativada até conectar a Stripe. Todas as páginas têm noindex. Noindex não é controle de acesso e não torna a prévia privada.

A atualização inclui páginas próprias e código do checkout embutido e do Worker. A integração ainda precisa ser configurada e testada com a conta Stripe. Não implementa envio de e-mail, área de membros, autenticação ou entrega dos PDFs. Esses serviços estão descritos como a operação prevista. Não existe login fictício ou formulário que simule uma entrega bem-sucedida.

O conteúdo do produto ainda precisa ser produzido e corresponder aos sete módulos e arquivos anunciados. Os exemplos do planner são ilustrativos.

## Pendências para a próxima revisão
1. Revisão dos requisitos de cada mercado, incluindo eventuais mecanismos próprios de desistimento e confirmação.
2. Organização do atendimento para cumprir o limite de 24 horas corridas.
3. Implementação do envio e ativação de acesso em até 24 horas.
4. Definição operacional da execução dos reembolsos: as 24 horas informadas são de resposta, não promessa de crédito bancário nesse período.
5. Lista operacional de países habilitados. Espanhol não implica aceitação mundial: Cuba consta nas restrições da Stripe.
6. Fornecedores reais de hospedagem, autenticação, arquivos, e-mail de entrega e pagamento, além de retenção de dados e transferências internacionais.
7. Plano técnico de continuidade para cumprir acesso sem vencimento. Não anunciar acesso permanente e limitá-lo retroativamente à vida da plataforma.
8. Produção e revisão do material, licença de uso e testes de compatibilidade de PDFs.
9. Política sobre licença e acesso depois de reembolso; não foi inventada uma condição final.
10. Testes integrados de compra, consentimento, entrega, duplicações, recibos e reembolsos.

## Observações sobre políticas
- Os links de solicitação de reembolso abrem e-mail ou WhatsApp. O visitante precisa enviar a mensagem. O clique não registra automaticamente um pedido.
- Não há uma função completa de desistimento eletrônico com protocolo/acuse automático. Essa implementação deverá ser avaliada e feita conforme os países atendidos.
- Garantia comercial de 60 dias incluída conforme solicitado. O prazo não substitui direitos legais mais favoráveis.
- A garantia descrita se refere ao kit principal. As condições dos upsells, especialmente do acompanhamento, precisam de definição antes de serem oferecidos.
- Nenhuma renúncia automática ao direito de desistimento foi aplicada por download.
- A privacidade distingue a prévia estática da operação futura. Não adicionar rastreamento sem atualizar os textos e a implementação aplicáveis.
- Gmail foi mantido conforme solicitado; domínio próprio não foi imposto como requisito universal.

## Correção de publicação
O design da página principal e das políticas depende de politicas.css, que deve ficar junto dos HTML. O checkout não depende desse arquivo. O proprietário confirmou que a publicação normalizou ao incluir esse arquivo; o CSS foi preservado byte a byte nesta atualização. Não houve redesenho nem troca de hospedagem.

## Verificação
Sintaxe JavaScript, IDs únicos e links internos verificados. Contatos e avisos revisados. Consulte CHECKOUT-LEIA-ME.md para a verificação do código de pagamento e os testes de integração ainda necessários.

## Referências consultadas para a revisão
- Stripe: https://stripe.com/legal/restricted-businesses
- Checklist: https://docs.stripe.com/get-started/checklist/website
- Argentina, Disposición 954/2025: https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto
- União Europeia, devoluções e desistimento: https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm
- LGPD compilada: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm

Essas referências não substituem a revisão jurídica do alcance territorial e da implementação final.
