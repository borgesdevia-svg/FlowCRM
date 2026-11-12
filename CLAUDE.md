FlowCRM

Plataforma web multiempresa de gestão de clientes (CRM) com automação de emails. Projeto da PAP (Prova de Aptidão Profissional), curso Técnico de Gestão e Programação de Sistemas Informáticos, 12.º ano. Defesa em março. O aluno tem de perceber e saber explicar TODO o código.

Como trabalhar comigo (regras principais)
Explica em português, de forma simples, o que fazes e porquê, antes de escreveres código.
Trabalha por fases pequenas. No fim de cada fase, pára e espera pela minha confirmação.
Explica cada conceito novo de React/Next (componente, estado, rota, código de servidor vs. de cliente) em linguagem simples, porque tenho de o explicar na defesa.
Comenta o código em português, nas partes importantes (não em cada linha).
NÃO mudes a stack, nem instales frameworks ou bibliotecas novas sem me perguntares primeiro.
Prefere soluções simples e legíveis a soluções "inteligentes" que eu não consiga explicar.
Nunca instales skills, plugins ou ferramentas globais sem me perguntares primeiro.
Se algo não estiver claro, pergunta em vez de assumires.
Se encontrares um erro, uma falha de segurança ou um risco, diz-me, mesmo que eu não tenha perguntado.
Faz commits pequenos, com mensagens claras em português.
Stack
Framework: Next.js (App Router) com React, em JavaScript (sem TypeScript, para o código ser mais fácil de ler e explicar).
Estilos: CSS simples ou CSS Modules. Não instales bibliotecas de componentes de UI sem me perguntares.
Base de dados e login: Supabase (Postgres + Auth + regras RLS).
Envio de emails: serviço externo por API, chamado a partir de código de servidor (a decidir).
Gráficos: Chart.js (ou biblioteca equivalente, depois de me perguntares).
Versionamento: Git e GitHub.
Funcionalidades (por níveis)

Nível 1 (essencial)

Registo de empresa, login/logout, perfis admin e comercial, admin cria utilizadores da sua empresa.
Isolamento total de dados entre empresas (empresa_id + RLS).
Clientes: criar, ver, editar, eliminar; estados; pesquisa e filtro por estado.
Formulário público por empresa (link próprio) que cria um lead no CRM dessa empresa.
Uma automação de email: boas-vindas a um novo lead.

Nível 2 (importante) 6. Dashboard com números e gráficos (novos leads, conversão, clientes por estado). 7. Histórico de interações e notas por cliente (a equipa colabora). 8. Tarefas e lembretes por cliente. 9. Pipeline por fases (primeiro com botões para mudar de fase). 10. Cada comercial vê só os seus clientes; o admin vê todos.

Nível 3 (extras, só se sobrar tempo) Arrastar e largar no pipeline, automações configuráveis, exportação CSV/PDF, chat entre membros, assistente de IA, faturação simulada.

Fora do âmbito: pagamentos reais, app móvel nativa, WhatsApp, certificação de faturas.

Base de dados (proposta inicial, o aluno revê e aprova)

Todas as tabelas de negócio têm empresa_id. Todas têm RLS ativo.

empresas: id, nome, slug, criado_em
perfis: id (= auth.users.id), empresa_id, nome, papel (admin | comercial)
clientes: id, empresa_id, responsavel_id, nome, email, telefone, estado (novo | negociacao | ativo | perdido), valor_previsto, origem, criado_em
interacoes: id, empresa_id, cliente_id, autor_id, tipo, nota, criado_em
tarefas: id, empresa_id, cliente_id, responsavel_id, titulo, data_limite, concluida
automacoes_log: id, empresa_id, cliente_id, tipo, estado, criado_em
Segurança (obrigatório)
Nunca guardes passwords em texto simples (o Supabase Auth trata disto).
Regras RLS em todas as tabelas: um utilizador só acede a linhas da sua empresa_id.
Valida os dados no formulário público e no servidor. Nunca confies só no front-end.
Nunca ponhas chaves secretas no código nem no GitHub; usa variáveis de ambiente e .gitignore.
A chave service_role do Supabase nunca vai para o front-end: só pode ser usada em código de servidor. Variáveis NEXT_PUBLIC_ são visíveis a toda a gente, por isso só levam chaves públicas.
Antes do primeiro commit, confirma que o .gitignore existe e ignora .env.local. Nunca faças commit de ficheiros .env.
Design

Tema escuro com preto como base e verde como destaque (paleta a confirmar).

Fundo 
#0A0A0A, cartões 
#121212, contornos 
#1F2A26, superfície verde escura 
#0B2A22
Destaque 
#22C55E, texto 
#F2F2F2
Modo claro: destaque mais escuro (
#15803D) para manter o contraste
Estados do cliente: novo 
#2563EB, em negociação 
#D97706, ativo 
#16A34A, perdido 
#6B7280
Interface limpa, responsiva (funciona no telemóvel) e com bom contraste. Mensagens de erro e confirmação claras.
Documentação (cofre Obsidian)

A pasta docs/ é um cofre Obsidian com as minhas notas, em Markdown. Pastas: BD, Decisões, Diário, Fontes, Modelos, Problemas e soluções, Relatório.

Antes de começares uma fase, lê as notas relevantes em docs/Decisões/ e docs/BD/.
Respeita as decisões que lá estão. Se achares que uma deve mudar, diz-me e pergunta antes de agires.
No fim de cada fase, propõe-me o texto para uma entrada em docs/Diário/ e, se houver, para docs/Problemas e soluções/. Eu reviso e guardo com as minhas palavras. Não escrevas o relatório por mim.
Se criares uma nota, escreve em português e usa ligações [[nome da nota]] para outras notas.
Nunca escrevas chaves, passwords nem dados reais de clientes nas notas.
Estrutura de pastas (proposta)
/app            páginas e rotas (landing, login, painel, clientes, formulário público em /f/[slug])
/components     componentes reutilizáveis (cartão de cliente, tabela, gráfico...)
/lib            ligação ao Supabase e funções auxiliares
/docs           diagrama da base de dados, notas, relatório
/supabase       SQL das tabelas e das regras RLS
```
Repositorio do github: https://github.com/borgesdevia-svg/FlowCRM.git

As chaves do Supabase ficam só em .env.local (nunca neste ficheiro nem no GitHub).
