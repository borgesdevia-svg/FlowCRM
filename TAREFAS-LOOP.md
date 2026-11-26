# Tarefas do loop (branch `loop-melhorias`)

Lista para o Claude trabalhar sozinho com `/loop`, enquanto o aluno está por perto.
Uma tarefa de cada vez, de cima para baixo. Marca `[x]` quando acabar e escreve uma linha
em "Notas" com o que fez (ou porque saltou).

## Regras (ler antes de CADA tarefa)

1. Trabalhar só no branch `loop-melhorias`. Nunca `git push`, nunca mudar para o `main`.
2. **Um commit por tarefa**, com mensagem em português a dizer o que mudou.
   Antes do commit: `npx eslint <ficheiros mexidos>`, `npm test` e `npx next build` têm de passar.
3. **Supabase: só leitura de código.** Não usar as ferramentas do Supabase para mudar nada.
   Se uma tarefa precisar de migração: escrever o `.sql` em `supabase/migrations/` (número seguinte),
   NÃO aplicar, e pôr na secção "Precisa do aluno".
4. Não instalar pacotes npm novos. Não mexer em `.env*`, nem nas chaves da Stripe.
5. Seguir as regras de design da memória (sem etiquetas/comprimidos decorativos, sem "→",
   sem hover em coisas não clicáveis, sem brilhos/planetas, animações só com propósito).
6. As skills do Emil Kowalski estão em `.agents/skills/<nome>/SKILL.md`: ler a skill indicada
   antes da tarefa e seguir as regras dela (mas sem o "Initial Response" de espera).
7. Se uma tarefa falhar 2 vezes ou precisar de uma decisão do aluno: saltar, escrever porquê
   em "Precisa do aluno" e passar à seguinte.
8. Não abrir separadores no browser (o servidor de desenvolvimento já está a correr).
9. Comentários no código em português, simples, como no resto do projeto.
10. Quando não houver mais `[ ]`: escrever um resumo curto no fim deste ficheiro e parar o loop.

## A. Polir o que existe

- [x] **A1. Leads com dados extremos** (skill `break-ui`). Página `/painel/clientes` e ficha
  `/painel/clientes/[id]`: nomes e emails enormes, empresa vazia, valor 9 999 999 €, lista vazia,
  muitos leads. Corrigir o que parte (texto a sair, colunas a saltar). Sem deixar o "toggle" de teste no código.
- [x] **A2. Pipeline e Tarefas com dados extremos** (skill `break-ui`). `/painel/pipeline`,
  `/painel/tarefas`, calendário e fila: títulos longos, colunas vazias, muitas tarefas no mesmo dia.
- [x] **A3. Telemóvel** (skill `mobile-native`). Rever o CSS do painel: hovers que ficam presos
  ao tocar (pôr em `@media (hover: hover) and (pointer: fine)`), `touch-action: manipulation` nos
  botões, alturas com `dvh`, `viewport-fit=cover` + `env(safe-area-inset-*)` para a app instalada.
- [x] **A4. Rever animações** (skill `review-animations`). Todo o CSS de `app/` e `components/`
  (menos a landing): `transition: all`, `ease-in`, durações acima de 300 ms em coisas pequenas,
  `scale(0)`, keyframes em coisas que se abrem/fecham depressa. Usar `--ease-out` do globals.css.
- [x] **A5. "Ar de IA" no painel.** Procurar no painel o mesmo que tirámos da landing:
  etiquetas/comprimidos decorativos, ícones dentro de quadrados coloridos, gradientes e brilhos
  só para enfeitar, textos de marketing ("num relance", "trabalha sozinho"). Corrigir o que for
  claramente decoração; dúvidas vão para "Precisa do aluno".

## B. Funções novas pequenas (só código)

- [x] **B1. Aviso de lead duplicado.** Ao criar ou editar um lead (`lib/acoes/clientes.js` e o
  formulário), se já existir outro lead da empresa com o mesmo email ou telefone, mostrar um aviso
  com link para esse lead ("Já existe a Marta Silva com este email"). Não bloquear a gravação:
  só avisar. Respeitar o RLS (o comercial só vê os seus). Testes para a função que compara.
- [x] **B2. Metas de vendas (só preparar).** Escrever a migração (tabela `metas`: empresa, mês,
  valor; RLS por empresa, só admin escreve) e um plano curto em "Precisa do aluno". NÃO aplicar
  e NÃO fazer a interface (depende da migração).

## C. Limpeza e testes

- [x] **C1. CSS e código que já não se usam.** Classes CSS sem uso em `.module.css`, componentes
  e funções exportadas que ninguém importa, comentários que falam de coisas que já não existem
  (ex.: "14 dias grátis", "grelha", "planeta"). Apagar com cuidado.
- [x] **C2. Testes para os planos.** Em `testes/planos.test.mjs`: empresa nova sem plano
  (`semPrimeiroPlano`), teste antigo ainda a correr, pago, cancelado/bloqueado.
- [x] **C3. Lint do projeto inteiro.** `npx eslint .` sem erros nem avisos.

## D. Segurança (só código)

- [x] **D1. Server Actions.** Ler cada ficheiro de `lib/acoes/`: cada ação verifica a sessão,
  o papel (admin quando deve) e valida o que vem do formulário? Corrigir no código. O que só se
  resolve na base de dados vai para "Precisa do aluno".
- [x] **D2. Páginas públicas e webhook.** `app/f/[slug]`, `app/p/[token]`, `app/api/stripe/webhook`,
  `/recuperar`: validação de entradas, assinatura do webhook, mensagens de erro que não revelam
  demais, redirecionamentos abertos. Corrigir no código.

## Notas (o que foi feito)

- A1: lista de leads — emails (até 254 letras) e nomes sem espaços partem em vez de alargar a tabela; nome do responsável parte em 2 linhas (máx. 200px). Ficha — nome do responsável parte dentro da caixa; no telemóvel as caixas Valor/Responsável descem quando o valor é grande. Verificado pelo CSS (sem browser). Lista vazia e 1 lead já estavam bem (textos próprios; paginação de 25).
- A2: pipeline e tarefas já estavam bem protegidos (nomes partem, colunas com scroll, "Ver todos" quando há muitos). Corrigido: nome do lead sem espaços nas tarefas saía da linha; textos cortados com "…" (email/responsável no cartão do pipeline, títulos no calendário) mostram-se inteiros ao passar o rato.
- A3: hovers que mexem (sobe/cresce) nas Configurações e no editor do formulário só com rato; alturas com dvh (painel, menu lateral, pipeline, formulário público, proposta, páginas de erro); todas as caixas de texto com 16px no telemóvel (o iPhone deixa de fazer zoom nas pesquisas); touch-action: manipulation em links e botões. Os outros ~140 hovers só mudam cor/fundo: deixados como estão.
- A4: sem `transition: all`, sem `ease-in`, sem `scale(0)` no painel. Encurtado o que se vê dezenas de vezes por dia: entrada das páginas do painel 300→200ms com atraso máx. 60ms (a ficha chegava a 500ms no total); Atividade recente 600ms + cascata de 300ms → 250ms + 120ms; aviso da lista de leads 400→250ms. O resto (janelas 200ms, tutorial, formulário público) já estava dentro das regras.
- A5: tirados brilhos e degradês decorativos do painel — barra de progresso do Início (degradê + brilho → verde liso), cartão da empresa do comercial, inicial da empresa e avatar do menu (degradê → cor lisa), brilho no canto do plano Pro (página Plano), do aviso "Função do CRM Pro" e do cartão de estado no formulário do lead. Mantido: etiquetas de estado (dão informação), cartão de crédito azul na Cobrança (imita um cartão), brilho do carregamento. Não há textos de marketing no painel.
- B1: ao criar/editar um lead, se já houver outro com o mesmo email (sem maiúsculas) ou telefone (sem espaços nem +351), aparece um aviso amarelo com link para esse lead e o botão passa a "Guardar mesmo assim". Não bloqueia; se mudares o email/telefone volta a verificar. Funções em lib/duplicados.js com 5 testes. Respeita o RLS (o comercial só compara com os seus). Não verifica no importar CSV nem no formulário público.
- B2: migração `supabase/migrations/32_metas.sql` escrita, NÃO aplicada (tabela metas: empresa, mês, valor; todos veem, só admin escreve, nada com a empresa bloqueada).
- C1: ~300 linhas de CSS sem uso apagadas (sobretudo o editor de perguntas antigo em Personalizar.module.css, setas de tendência antigas do Início, botões de modo das Configurações, .sucesso e .voltar soltos). Apagadas 2 funções que ninguém chamava: estiloCor (lib/formulario.js) e a Server Action apagarTarefa (já existe apagarTarefas, para várias). Inicial do logótipo sem degradê. Classes usadas de forma dinâmica (styles[`tipo-${x}`]) foram deixadas.
- C2: 5 testes novos em testes/planos.test.mjs — empresa nova sem dias grátis (bloqueada + semPrimeiroPlano), cancelou depois de pagar, a pagar, teste antigo ainda a correr, cancelado com fim marcado. 70 testes a passar.
- C3: `npx eslint .` já passa sem erros nem avisos (nada a corrigir).
- D1: todas as ações de lib/acoes verificam a sessão (obterSessao manda para o login), as de admin verificam eAdmin no servidor, e o RLS repete tudo. O responsável de um lead tem de ser da mesma empresa (chave estrangeira com empresa_id). Corrigido: 9 ações aceitavam qualquer texto como id (apagar lead/nota/proposta, mudar fase, marcar tarefa, WhatsApp, atribuir, remover membro, mudar papel); agora todos os ids passam por eUuid (lib/validacao.js, com teste). O regex antigo aceitava 36 traços. Email do registo limitado a 254 letras.
- D2: webhook da Stripe já estava bem (verifica a assinatura antes de tudo, liga à empresa pela metadata posta pelo servidor, ignora avisos atrasados de assinaturas antigas, 500 para a Stripe repetir). Sem redirecionamentos abertos (só para caminhos fixos ou páginas da Stripe). Recuperação já dava a mesma resposta para email e chave errados. Corrigido: /f/[slug] e o envio do formulário confirmam o formato do slug (eSlug, a mesma regra da base de dados) antes de ir ao Supabase; /p/[token] usa o eUuid partilhado (o antigo aceitava 36 traços); /recuperar fora do Google (noindex). 72 testes a passar.

## Precisa do aluno

- D2: o formulário público só tem o campo "armadilha" contra spam. Um robô mais esperto pode enviar centenas de leads falsos. Para travar a sério é preciso um limite por IP (função na base de dados ou a firewall da Vercel) ou um captcha (Cloudflare Turnstile, grátis). Ambos precisam de uma decisão tua e de configuração fora do código.

- D1: no registo, "Já existe uma conta com este email" deixa alguém descobrir que emails usam o FlowCRM (a recuperação já tem cuidado com isso). Trocar por uma mensagem neutra torna o registo mais confuso para quem se engana. Para um CRM pequeno parece-me aceitável manter; decide tu.

- B2 (metas de vendas): 1) migração 32_metas.sql APLICADA a 2026-11-26; 2) depois faço: em Configurações (ou na Visão geral, só admin) uma caixa "Meta deste mês: ____ €"; na Visão geral uma barra "7 400 € de 12 000 € (62%)" com o valor dos leads que passaram a Ativo este mês; 3) decidir: é só para o Pro ou para os dois planos? meta da empresa toda ou também por comercial?

- A5: o logótipo no site (barra de cima, rodapé, login) tem um brilho verde à volta. É pequeno, mas é "brilho". Tirar também?

- A4: os números do Início "contam" de 0 até ao valor (900ms) sempre que a página abre. A skill desaconselha (página vista muitas vezes por dia), mas foste tu que pediste "números a contar". Queres manter, encurtar para ~400ms, ou só contar na primeira visita do dia?

- A3: `viewport-fit=cover` + margens `env(safe-area-inset-*)` para a app instalada no iPhone (conteúdo por baixo do notch) NÃO foi feito: sem um iPhone para testar, arrisca pôr a barra de cima por baixo do relógio. Testar quando tiveres o iPhone à mão.

## Resumo do loop (2026-11-26)

Todas as tarefas feitas, 1 commit por tarefa no branch `loop-melhorias` (sem push, `main` intocado).
- Polir: textos enormes já não partem a lista, a ficha, a pipeline nem o calendário; telemóvel (hovers presos, dvh, 16px nas caixas); animações mais curtas; brilhos e degradês do painel tirados.
- Novo: aviso de lead duplicado (email/telefone) ao criar ou editar; migração das metas de vendas escrita mas NÃO aplicada.
- Limpeza: ~300 linhas de CSS e 2 funções sem uso apagadas; lint limpo; testes 65 → 72.
- Segurança: ids e slugs validados em todas as ações e páginas públicas; webhook, recuperação e redirecionamentos revistos (estavam bem).
- Falta: as decisões em "Precisa do aluno" (metas, brilho do logótipo, números a contar, iPhone, mensagem do registo, spam no formulário). Para levar para o `main`: `git checkout main` e `git merge loop-melhorias`.

## Decisões do aluno (2026-11-26)

- Metas: meta da empresa toda, nos dois planos. Feito: bloco "Meta de <mês>" na Visão geral (só admin).
- Brilho do logótipo: tirado. Números do Início: contam em 400ms.
- Spam no formulário: limite por IP (migração 33, 10 envios por hora). Mensagem do registo: mantém-se.
- iPhone (viewport-fit=cover): fica para quando houver um iPhone para testar.
