# Blend

Loja Next.js de produto com páginas configuráveis, painel administrativo e estrutura para futuras integrações de pagamento. Os dados e mídias ficam em SQLite e arquivos locais, sem Redis ou Docker. Os componentes visuais reutilizáveis do painel ficam em `components/base`.

## Instalação

Requer Node.js 22.13 ou superior com `node:sqlite` habilitado. Para executar os testes do cofre, use Node.js 22.15 ou superior.

1. Execute `npm install`.
2. Execute `npm run dev` e acesse `http://localhost:3000`. Na primeira execução, crie o administrador com usuário de pelo menos 3 caracteres e senha de pelo menos 12 caracteres. Essa etapa só aceita conexões diretas do próprio computador em um endereço local.
3. Opcionalmente, copie `.env.example` para `.env.local` para configurar a URL pública, o local das chaves e integrações. Em produção, `SHOP_URL` é necessário.
4. Crie um produto, personalize o conteúdo e salve. A rota escolhida é um único segmento, como `/meu-produto`. O editor aceita até duas opções de compra e envia arquivos PNG, JPEG, WebP e MP4 de até 32 MB; URLs HTTPS também são aceitas. Preços são expressos em centavos.
5. A seção **Pagamentos** mostra que não há provedor instalado. O checkout fica indisponível até que uma integração seja desenvolvida e configurada.

Em produção execute `npm run build` e `npm start`, com HTTPS e domínio público. O servidor incluso pode servir TLS diretamente: configure `TLS_KEY_PATH` e `TLS_CERT_PATH` com os caminhos dos arquivos PEM. Configure `SHOP_URL` com a origem HTTPS pública exata. O certificado precisa ser obtido e renovado pelo operador. O checkout depende de o domínio ser alcançável pelo gateway para receber webhooks. `PORT` e `SHOP_HOST` são opcionais.

Use os scripts incluídos: o servidor `server.mjs` substitui qualquer cabeçalho de IP fornecido pelo cliente pelo endereço da conexão. Executar diretamente `next start` ou `next dev` ignora essa proteção. Caso seja colocado atrás de proxy, o IP observado será o do proxy; a aplicação não confia em cabeçalhos encaminhados e deve ser adaptada antes de usar esse cenário com pagamentos.

## Sites por domínio e arquivos

Em **Configurar site**, informe o domínio completo sem protocolo (por exemplo, `www.exemplo.com.br`), título e descrição de SEO, indexação, favicon e imagem de compartilhamento. Cada domínio pode pertencer a apenas um produto. O domínio abre o produto na raiz e recebe seus próprios metadados, `robots.txt` e sitemap; a rota original continua disponível no domínio central. Cadastre exatamente o endereço que será acessado, inclusive `www` quando aplicável.

O cadastro não altera o DNS nem emite certificados. Aponte o domínio para o servidor e configure HTTPS para todos os domínios e para `SHOP_URL`, que continua sendo a origem central do painel e dos webhooks. O servidor incluído usa um único par de certificado/chave: ele precisa cobrir todos os domínios (por exemplo, certificado com nomes alternativos) ou ser substituído por uma terminação TLS adequada. Como explicado abaixo, uma configuração com proxy exige adaptar a identificação confiável do IP antes de operar pagamentos. DNS, emissão e renovação dos certificados são responsabilidade do operador.

O painel envia PNG, JPEG, WebP e MP4 de até 32 MB. Novos arquivos são armazenados em `data/projects/<id>/public/assets/`, usando seus bytes originais e disco persistente. Cada projeto possui diretórios para `plugins/payments`, `plugins/ui` e `templates`, e um `project.json` legível com uma cópia da configuração. O SQLite é a fonte de verdade; editar o JSON manualmente não altera o site. A identificação permanece a mesma se a rota mudar. Arquivos anteriores continuam acessíveis; remover ou substituir uma imagem no painel não apaga o arquivo do disco automaticamente. Inclua todo o diretório de dados no backup.

### Projetos e pagamentos

Os projetos têm configurações e pastas separadas para plugins e arquivos. O catálogo de pagamento está vazio e as seleções antigas não habilitam cobranças. O botão de compra fica desabilitado, e requisições à API de checkout recebem resposta de indisponibilidade sem criar pedidos.

Os contratos em `src/plugins` e `src/payments` são uma base para integrações futuras. Ainda não existe SDK publicado, instalador por Git, execução isolada ou implementação de Pagar.me, Appmax ou Mercado Pago. Essas integrações precisarão definir autenticação, tokenização segura, confirmação de pagamento e webhooks antes do uso.

Pedidos que já estejam no banco são preservados, mas não serão atualizados ou conciliados automaticamente enquanto o provider original estiver ausente. Não alteramos os arquivos `.env` existentes; variáveis de integrações removidas deixam de ser usadas.

## Pedidos no Google Sheets

A integração é opcional e fica desativada por padrão. O SQLite é o registro principal; uma fila local guarda as atualizações e tenta novamente se o Google Sheets estiver indisponível. O servidor precisa permanecer em execução para processar a fila. Nenhum dado de cartão é armazenado ou enviado à planilha.

Para configurar após criar sua planilha:

1. No Google Cloud, habilite a Google Sheets API e crie uma conta de serviço com uma chave JSON. Mantenha o JSON **fora do repositório**, com acesso restrito. Consulte a [documentação de contas de serviço](https://developers.google.com/identity/protocols/oauth2/service-account).
2. Crie uma planilha e uma **aba nova e vazia** chamada `Pedidos` (ou escolha outro nome para `GOOGLE_SHEETS_TAB`). Compartilhe a planilha com o e-mail da conta de serviço, dando permissão de editor.
3. No `.env.local`, defina `GOOGLE_SHEETS_ENABLED=true`, `GOOGLE_SHEETS_SPREADSHEET_ID` com o ID entre `/d/` e `/edit` no link da planilha e `GOOGLE_APPLICATION_CREDENTIALS` com o caminho absoluto para o JSON. Se necessário, defina `GOOGLE_SHEETS_TAB`. No Windows prefira barras `/` no caminho. Reinicie o servidor.
4. Faça uma venda de teste usando o ambiente de teste do gateway, quando disponível, e confirme o pedido e suas atualizações na planilha. O painel de admin mostra quantos registros estão pendentes ou aguardando nova tentativa; credenciais inválidas, falta de acesso ou aba incompatível impedem a sincronização, mas não apagam a venda local.

Na primeira sincronização, o projeto escreve os cabeçalhos e gerencia as colunas **A:T**, incluindo dados do cliente, endereço, produto e status do pagamento. As colunas **U:X** são reservadas para edição manual: status de envio, compra na Shopee, rastreamento e observações. Edite apenas U em diante; não ordene, mova, insira ou apague linhas na aba sincronizada. Se uma linha for ocupada ou um ID aparecer em outra linha, a integração interrompe aquela atualização para não sobrescrever outro pedido. Use filtros que não alterem a ordem ou crie outra aba para relatórios. A escrita usa `RAW`, preservando CEP e CPF como texto e sem interpretar fórmulas.

Os status de envio e as observações digitados na planilha são manuais e **não retornam ao projeto**. Se mudar o ID ou o nome da aba no ambiente, o projeto tentará sincronizar novamente todos os pedidos na nova aba. Faça backup do banco e use uma aba vazia dedicada; restaurar o banco para uma versão antiga pode deixar a sincronização pendente até corrigir eventuais conflitos. Guarde e compartilhe planilha e backup apenas com pessoas autorizadas, pois contêm CPF, contato e endereço.

## Dados e segurança

`data/shop.sqlite` contém produtos, pedidos, dados pessoais, sessões e o hash da senha do administrador. O banco inteiro **não é criptografado**. A estrutura de cofre dos futuros plugins usa AES-256-GCM para criptografar cada segredo no SQLite; ainda não há interface de configuração de plugins disponível. A chave do cofre e a chave de sessão são geradas separadamente em `data/keys/` durante os primeiros passos. Restrinja o acesso do sistema operacional a essas chaves e configure `SHOP_KEYS_DIR` para armazená-las fora do diretório do banco quando possível. O local das chaves precisa ser persistente e ter backup seguro separado: perder `vault.key` impede recuperar os segredos cifrados; perder `session.key` invalida as sessões e exige restaurar a chave. Não compartilhe backups do banco e das chaves no mesmo local sem proteção adequada. `SHOP_DATA_DIR` muda o diretório de dados.

O cadastro inicial aceita apenas loopback direto, exige origem local no envio e fecha após a criação do administrador; não exponha essa etapa por proxy que encaminhe tráfego remoto como se fosse local. O login possui limite persistente por IP e global, sessão revogável no servidor e cookie HttpOnly/SameSite Strict/Secure em produção. As operações de administração são autorizadas no servidor. Nenhum limite local impede sozinho ataques volumétricos ou esgotamento de banda. Não há autenticação multifator nem recuperação de conta.

Instalações anteriores com `ADMIN_USERNAME`, `ADMIN_PASSWORD` (mínimo de 12 caracteres) e `SESSION_SECRET` no ambiente continuam usando essas credenciais; não é criada outra conta automaticamente. Após uma conta ser criada no SQLite, ela tem prioridade sobre as variáveis antigas. O cofre é apenas uma fundação: plugins e formulários de credenciais ainda precisam ser implementados e autorizados no servidor.

## Estrutura e validação

- `src/catalog` e `src/projects`: produto, identidade e armazenamento dos projetos.
- `src/plugins`: descrições dos providers internos e contratos preparatórios para plugins.
- `components/base`: componentes reutilizáveis, página compartilhada e editor com prévia.
- `src/payments`: contratos e pedidos; o catálogo de providers está vazio.
- `src/security`: sessões e limites.
- `src/integrations/google-sheets`: sincronização assíncrona da fila local.

O CSS e as principais seções foram adaptados do tema fornecido. Ainda é necessária uma comparação visual sistemática em desktop e mobile para afirmar equivalência 1:1; alguns ícones, estados e detalhes do tema original foram recriados. Novos projetos começam sem avaliações e usam uma imagem provisória até o envio dos arquivos do produto.

Execute `npm run lint` e `npm test`. Os testes verificam projetos, autenticação, upload, isolamento de domínio e indisponibilidade do checkout sem provider, além de repetição segura e preservação das colunas manuais no Sheets simulado.
