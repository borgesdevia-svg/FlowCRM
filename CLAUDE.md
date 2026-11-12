# FlowCRM

Plataforma web multiempresa de gestão de clientes (CRM) com automação de emails. Projeto da PAP (Prova de Aptidão Profissional), curso Técnico de Gestão e Programação de Sistemas Informáticos, 12.º ano. Defesa em março. O aluno tem de perceber e saber explicar TODO o código.

## Como trabalhar comigo (regras principais)

- Explica em português, de forma simples, o que fazes e porquê, antes de escreveres código.
- Trabalha por fases pequenas. No fim de cada fase, pára e espera pela minha confirmação.
- Explica cada conceito novo de React/Next (componente, estado, rota, código de servidor vs. de cliente) em linguagem simples, porque tenho de o explicar na defesa.
- Comenta o código em português, nas partes importantes (não em cada linha).
- NÃO mudes a stack, nem instales frameworks ou bibliotecas novas sem me perguntares primeiro.
- Prefere soluções simples e legíveis a soluções "inteligentes" que eu não consiga explicar.
- Nunca instales skills, plugins ou ferramentas globais sem me perguntares primeiro.
- Se algo não estiver claro, pergunta em vez de assumires.
- Se encontrares um erro, uma falha de segurança ou um risco, diz-me, mesmo que eu não tenha perguntado.
- Faz commits pequenos, com mensagens claras em português.

## Stack

- Framework: Next.js 16 (App Router) com React, em JavaScript (sem TypeScript, para o código ser mais fácil de ler e explicar).
- Estilos: CSS simples ou CSS Modules. Não instales bibliotecas de componentes de UI sem me perguntares.
- Base de dados e login: Supabase (Postgres + Auth + regras RLS).
- Envio de emails: serviço externo por API, chamado a partir de código de servidor (a decidir; recomendado: Resend).
- Gráficos: Chart.js (aprovado e instalado).
- Arrastar e largar: drag-and-drop nativo do HTML5 (sem biblioteca).
- Versionamento: Git e GitHub.

## Funcionalidades (por níveis)

**Nível 1 (essencial)**
1. Registo de empresa, login/logout, perfis admin e comercial, admin cria utilizadores da sua empresa.
2. Isolamento total de dados entre empresas (empresa_id + RLS).
3. Clientes: criar, ver, editar, eliminar; estados; pesquisa e filtro por estado.
4. Formulário público por empresa (link próprio) que cria um lead no CRM dessa empresa.

**Nível 2 (importante)**
5. Dashboard com números e gráficos (novos leads, conversão, clientes por estado).
6. Histórico de interações e notas por cliente (a equipa colabora).
7. Tarefas e lembretes por cliente.
8. Pipeline por fases (botões para mudar de fase + arrastar e largar).
9. Cada comercial vê só os seus clientes; o admin vê todos.

**Opcional (decisão do aluno: deixou de ser obrigatório)**
- Uma automação de email: boas-vindas a um novo lead.

**Nível 3 (extras, só se sobrar tempo)**
Automações configuráveis, exportação PDF, chat entre membros, assistente de IA, faturação simulada.

**Fora do âmbito:** pagamentos reais, app móvel nativa, WhatsApp, certificação de faturas.

### Estado atual (feito)
- Níveis 1 e 2 completos.
- Extras já feitos: pesquisa global (Ctrl+K), atividade recente, página Tarefas com filtros, sino de notificações, exportação CSV, arrastar e largar no pipeline, mostrar/confirmar password.
- Por fazer: email de boas-vindas (opcional), revisão de segurança, publicação na Vercel.

## Base de dados

Todas as tabelas de negócio têm empresa_id. Todas têm RLS ativo. O SQL está em `supabase/migrations/` (01 a 05, por ordem).

- **empresas:** id, nome, slug, criado_em
- **perfis:** id (= auth.users.id), empresa_id, nome, email, papel (admin | comercial), criado_em
- **clientes:** id, empresa_id, responsavel_id, nome, email, telefone, estado (novo | negociacao | ativo | perdido), valor_previsto, origem, criado_em
- **interacoes:** id, empresa_id, cliente_id, autor_id, tipo (nota | chamada | email | reuniao | sistema), nota, criado_em
  - `sistema` = evento automático (mudança de fase, tarefa concluída), usado na atividade recente.
- **tarefas:** id, empresa_id, cliente_id, responsavel_id, titulo, data_limite, concluida
- **automacoes_log:** id, empresa_id, cliente_id, tipo, estado, criado_em

## Segurança (obrigatório)

- Nunca guardes passwords em texto simples (o Supabase Auth trata disto).
- Regras RLS em todas as tabelas: um utilizador só acede a linhas da sua empresa_id.
- Valida os dados no formulário público e no servidor. Nunca confies só no front-end.
- Nunca ponhas chaves secretas no código nem no GitHub; usa variáveis de ambiente e .gitignore.
- A chave secreta do Supabase (service_role) nunca vai para o front-end: só pode ser usada em código de servidor (`lib/supabase/admin.js`). Variáveis NEXT_PUBLIC_ são visíveis a toda a gente, por isso só levam chaves públicas.
- Antes do primeiro commit, confirma que o .gitignore existe e ignora .env.local. Nunca faças commit de ficheiros .env.

Variáveis em `.env.local` (só os nomes; os valores nunca vão para aqui nem para o GitHub):
- `NEXT_PUBLIC_SUPABASE_URL` (pública)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (pública)
- `SUPABASE_SECRET_KEY` (secreta, só servidor)

## Design

Tema escuro com preto como base e verde como destaque. As cores estão como variáveis CSS em `app/globals.css`.

| Uso | Cor |
|---|---|
| Fundo | #090909 |
| Fundo secundário (menu, faixas) | #101211 |
| Cartões | #141615 |
| Contornos | #252925 |
| Superfície verde escura | #0D3020 |
| Destaque (verde) | #20C96B |
| Texto | #F5F5F5 |
| Texto suave | #A1A1A1 |

Estados do cliente: novo #2563EB, em negociação #D97706, ativo #16A34A, perdido #6B7280.

Modo claro (ainda não feito): destaque mais escuro (#15803D) para manter o contraste.

Estilo do painel: grelha fina e brilho verde no topo das páginas, números a contar, entradas animadas em cascata (respeitando `prefers-reduced-motion`). Os cartões não têm cores diferentes entre si.

Interface limpa, responsiva (pensada primeiro para computador, sem partir no telemóvel) e com bom contraste. Mensagens de erro e confirmação claras.

## Documentação (cofre Obsidian)

A pasta `docs/` é um cofre Obsidian com as minhas notas, em Markdown. Pastas: BD, Decisões, Diário, Fontes, Modelos, Problemas e soluções, Relatório.

- Antes de começares uma fase, lê as notas relevantes em docs/Decisões/ e docs/BD/.
- Respeita as decisões que lá estão. Se achares que uma deve mudar, diz-me e pergunta antes de agires.
- No fim de cada fase, propõe-me o texto para uma entrada em docs/Diário/ e, se houver, para docs/Problemas e soluções/. Eu reviso e guardo com as minhas palavras. Não escrevas o relatório por mim.
- Se criares uma nota, escreve em português e usa ligações [[nome da nota]] para outras notas.
- Nunca escrevas chaves, passwords nem dados reais de clientes nas notas.

## Estrutura de pastas

```
/app            páginas e rotas (landing, login, registo, painel, formulário público em /f/[slug])
/app/painel     clientes, pipeline, tarefas, equipa, conta
/components     componentes reutilizáveis (landing, painel, clientes, tarefas, equipa, conta, auth...)
/lib            ligação ao Supabase, Server Actions (lib/acoes) e funções auxiliares
/docs           cofre Obsidian: notas, decisões, diário, relatório
/supabase       SQL das tabelas e das regras RLS (migrations)
```

Repositório do GitHub: https://github.com/borgesdevia-svg/FlowCRM.git

As chaves do Supabase ficam só em .env.local (nunca neste ficheiro nem no GitHub).
