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

- [ ] **A1. Leads com dados extremos** (skill `break-ui`). Página `/painel/clientes` e ficha
  `/painel/clientes/[id]`: nomes e emails enormes, empresa vazia, valor 9 999 999 €, lista vazia,
  muitos leads. Corrigir o que parte (texto a sair, colunas a saltar). Sem deixar o "toggle" de teste no código.
- [ ] **A2. Pipeline e Tarefas com dados extremos** (skill `break-ui`). `/painel/pipeline`,
  `/painel/tarefas`, calendário e fila: títulos longos, colunas vazias, muitas tarefas no mesmo dia.
- [ ] **A3. Telemóvel** (skill `mobile-native`). Rever o CSS do painel: hovers que ficam presos
  ao tocar (pôr em `@media (hover: hover) and (pointer: fine)`), `touch-action: manipulation` nos
  botões, alturas com `dvh`, `viewport-fit=cover` + `env(safe-area-inset-*)` para a app instalada.
- [ ] **A4. Rever animações** (skill `review-animations`). Todo o CSS de `app/` e `components/`
  (menos a landing): `transition: all`, `ease-in`, durações acima de 300 ms em coisas pequenas,
  `scale(0)`, keyframes em coisas que se abrem/fecham depressa. Usar `--ease-out` do globals.css.
- [ ] **A5. "Ar de IA" no painel.** Procurar no painel o mesmo que tirámos da landing:
  etiquetas/comprimidos decorativos, ícones dentro de quadrados coloridos, gradientes e brilhos
  só para enfeitar, textos de marketing ("num relance", "trabalha sozinho"). Corrigir o que for
  claramente decoração; dúvidas vão para "Precisa do aluno".

## B. Funções novas pequenas (só código)

- [ ] **B1. Aviso de lead duplicado.** Ao criar ou editar um lead (`lib/acoes/clientes.js` e o
  formulário), se já existir outro lead da empresa com o mesmo email ou telefone, mostrar um aviso
  com link para esse lead ("Já existe a Marta Silva com este email"). Não bloquear a gravação:
  só avisar. Respeitar o RLS (o comercial só vê os seus). Testes para a função que compara.
- [ ] **B2. Metas de vendas (só preparar).** Escrever a migração (tabela `metas`: empresa, mês,
  valor; RLS por empresa, só admin escreve) e um plano curto em "Precisa do aluno". NÃO aplicar
  e NÃO fazer a interface (depende da migração).

## C. Limpeza e testes

- [ ] **C1. CSS e código que já não se usam.** Classes CSS sem uso em `.module.css`, componentes
  e funções exportadas que ninguém importa, comentários que falam de coisas que já não existem
  (ex.: "14 dias grátis", "grelha", "planeta"). Apagar com cuidado.
- [ ] **C2. Testes para os planos.** Em `testes/planos.test.mjs`: empresa nova sem plano
  (`semPrimeiroPlano`), teste antigo ainda a correr, pago, cancelado/bloqueado.
- [ ] **C3. Lint do projeto inteiro.** `npx eslint .` sem erros nem avisos.

## D. Segurança (só código)

- [ ] **D1. Server Actions.** Ler cada ficheiro de `lib/acoes/`: cada ação verifica a sessão,
  o papel (admin quando deve) e valida o que vem do formulário? Corrigir no código. O que só se
  resolve na base de dados vai para "Precisa do aluno".
- [ ] **D2. Páginas públicas e webhook.** `app/f/[slug]`, `app/p/[token]`, `app/api/stripe/webhook`,
  `/recuperar`: validação de entradas, assinatura do webhook, mensagens de erro que não revelam
  demais, redirecionamentos abertos. Corrigir no código.

## Notas (o que foi feito)

## Precisa do aluno

