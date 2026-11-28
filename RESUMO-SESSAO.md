# Resumo da sessão de 2026-11-27 (noite): Documentos e E-mail no CRM

Para continuar numa próxima conversa com o Claude: "Lê o RESUMO-SESSAO.md e continua."

## Estado

- **Nada tem commit.** Está tudo na pasta, à espera de o aluno experimentar e autorizar commit + push.
- `npm test` passa (137/137), o lint está limpo e o `npm run build` compila.
- **Nada foi visto no browser** e **nenhum e-mail real foi enviado nem recebido** (não há nenhuma conta de e-mail ligada).
- Supabase: migrações 41, 41b, 42 e 43 **aplicadas**. Vercel: `EMAIL_CHAVE` e `EMAIL_CRON_SEGREDO` criadas (Production).

## Decisões (grilling de 2026-11-27)

- **Imagens: todas as que as pessoas carregam ficam em WebP**, com qualidade 85 e no máximo 2000 px (`lib/imagens.js`, com o `sharp`). Vale para documentos, anexos recebidos e logótipo do formulário. Os ícones do site ficam em PNG.
- **Documentos:** existem nos dois planos, mas a categoria **Fatura é só do Pro** (no Essencial não aparece). Máximo 10 MB por ficheiro e **200 MB por empresa** (`MAX_EMPRESA` em `lib/documentos.js`; sobe quando houver Supabase Pro).
- **E-mail:** está nos dois planos. Para enviar é **obrigatório ligar a conta** por SMTP/IMAP. Limite por pessoa e por dia: **100 no Essencial, 400 no Pro**.
- **Outlook.com / Hotmail não funcionam:** a Microsoft só aceita OAuth desde 16/09/2024, por isso aparece um aviso a pedir outra conta.
- **Gmail:** precisa da verificação em 2 passos e de uma password de aplicação (https://myaccount.google.com/apppasswords).
- **Receber:** a cada 5 minutos o CRM lê a caixa e só guarda os e-mails vindos de leads da empresa. Na 1.ª ligação vai buscar os últimos 30 dias. Os anexos vão para os Documentos. O responsável do lead recebe um aviso.
- Vê os e-mails quem vê o lead, incluindo o admin. Desligar a conta não apaga o histórico.

## O que foi feito

### Ficha do lead (`app/painel/clientes/[id]/page.js`)
- Ocupa o ecrã todo e tem **4 separadores** em duas colunas: **Atividade** (tarefas e reuniões | histórico), **E-mails** (escrever | conversa), **Documentos e propostas**, **Dados**.
- Trocar de separador é **instantâneo**: tudo carrega uma vez e o browser só mostra a parte certa (`components/Separadores.js`, com `?sec=` no URL).
- A tabela de leads tem um botão **"Email"** em cada linha, que abre a ficha no separador E-mails.
- O antigo botão que abria o Gmail foi apagado.

### Documentos
- Ficheiros: `components/clientes/Documentos.js`, `lib/documentos.js` e `lib/acoes/documentos.js`.
- O envio vai do browser diretamente para o Storage, porque a Vercel corta pedidos acima de 4,5 MB. O servidor confirma o ficheiro e converte as imagens.
- Os documentos abrem com um link de 60 s (`/painel/clientes/<id>/documentos/<doc>`).
- Apagar um lead apaga também os ficheiros. A exportação RGPD lista os documentos.

### E-mail: ligar a conta e enviar (Fase 2)
- A conta liga-se em **A minha conta**, no separador **Conta de e-mail**. O CRM testa o SMTP e o IMAP antes de guardar.
- A password fica cifrada com AES-256-GCM, usando a `EMAIL_CHAVE` (`lib/email/cifra.js`).
- A janela de envio (`components/clientes/JanelaEmail.js` e `EmailsLead.js`) tem:
  - a mensagem do início, um modelo e a assinatura;
  - anexos escolhidos dos documentos do lead;
  - "Responder" em cada e-mail recebido, que mantém a conversa junta;
  - o botão **Enviar** verde com o avião de papel.
- Cada envio fica no histórico, conta como último contacto e é copiado para a pasta "Enviados" (no Gmail não é preciso).

### E-mail: receber (Fase 3)
- Ficheiros: `lib/email/receber.js` e `app/api/emails/receber/route.js`, protegida pelo `EMAIL_CRON_SEGREDO`.
- No Supabase, o job pg_cron `receber-emails` corre `*/5 * * * *` e faz POST para `https://flow-crm-blush-psi.vercel.app/api/emails/receber` (pg_net; o segredo está no Vault com o nome `cron_emails_segredo`).
- Na ficha há o botão **"Ver e-mails novos"**, que vai buscar já, e mostra a hora da última leitura e o último erro.

### Página nova "E-mails" (`/painel/emails`, no menu a seguir a Tarefas)
- **Mensagem do início:** o texto que vai sempre no começo, com `{saudacao}`, `{nome}`, `{empresa}` e `{eu}`.
- **Modelos de e-mail:** cada pessoa tem os seus (até 30), com nome, assunto e texto. Quem ainda não tem nenhum vê 3 sugestões. Na ficha, "Usar um modelo" preenche o e-mail.
- Base de dados: migração 43, tabela `email_modelos`.

### A minha conta
- Tem 4 separadores: **Perfil**, **Segurança**, **Avisos** e **Conta de e-mail**.
- O link antigo `/painel/conta#email` continua a funcionar.

### Correção: página preta depois de criar conta ou entrar
- Uma empresa nova nasce bloqueada até pagar. O registo e o login mandavam para `/painel` e o layout voltava a redirecionar para `/painel/plano`. Este redirect logo a seguir ao de uma Server Action deixava a página vazia, com fundo preto.
- Agora `lib/acoes/autenticacao.js` (`destinoDepoisDeEntrar`) vai logo para `/painel/plano` quando a empresa está bloqueada. Testado no localhost com duas contas de teste, depois apagadas. **Só chega ao site publicado com o próximo deploy.**

### Entrada (leads à espera de ser aceites)
- Nova aba **Entrada** no menu, acima de Leads, só para o admin, com o número de leads à espera. Os leads sem responsável ficam lá até o admin escolher quem fica com eles (**Aceitar**) ou os apagar (**Rejeitar**). Não aparecem em Leads, Pipeline nem Visão geral enquanto lá estão (migração 44 + filtros).
- Com o CRM aberto, aparece um aviso no canto do ecrã quando chega um lead novo ("Lead novo: …", com "Abrir a Entrada"). Funciona sem push. Os avisos push de leads sem responsável também abrem a Entrada.
- **Todos** os leads do formulário passam pela Entrada. A roleta do Pro (distribuir à vez) só corre ao aceitar: a opção "À vez pela equipa" vem escolhida (migração 45). Quem fica com o lead recebe push e um aviso no ecrã "Ficou para ti".
- Os avisos de leads novos estão **ligados por predefinição**: o browser pede a permissão no primeiro toque no painel (`components/painel/LigarAvisos.js`). Quem os desligar em A minha conta fica com eles desligados.
- Ficheiros: `app/painel/entrada/page.js`, `components/entrada/*`, `lib/acoes/entrada.js`.

### Correções e mudanças de 2026-11-28 (noite)
- **Leads e Pipeline vazios:** a migração 45 ligou `atribuido_por` às pessoas e tornou ambíguo o `perfis(nome)` de todas as listas. A ligação foi tirada na 45b, já aplicada; isto corrigiu também o site publicado.
- **Tarefas:** o círculo só seleciona. Para concluir carrega-se em "Marcar como feita" na barra que aparece. O aviso "Desfazer" deixou de existir.
- **A minha conta:** 2 separadores. Perfil tem perfil, avisos, conta de e-mail e formulário público; Segurança tem password, sessões e chave.
- **Formulário (editor):** 2 colunas. Edição larga à esquerda, com os separadores Textos, Perguntas, Design e Depois de enviar e tamanhos maiores. A pré-visualização é pequena, à direita, em Telemóvel por predefinição; em ecrãs estreitos fica atrás de "Pré-visualizar". Os estilos do editor de perguntas, apagados por engano no commit 6e2340d, foram repostos.
- **Supabase MCP:** sempre aceite (`~/.claude/settings.json` e `.claude/settings.local.json`).

## Base de dados (todas aplicadas)
- 39/40: tabelas `contas_email`, `emails` e `documentos`, e o bucket privado `documentos` (recriadas a partir do Supabase).
- 41/41b: a Fatura só no Pro. A 41b corrige a 41, que usava `tem_pro` e dava "permission denied".
- 42: estado da leitura IMAP em `contas_email`, mais `pg_net`, o cron e o Vault.
- 43: `email_modelos`.

## Próximos passos

1. **Experimentar no browser** (`npm run dev`):
   - a ficha do lead (separadores, documentos, envio de um PDF e de uma foto);
   - A minha conta (separadores);
   - a página E-mails (mensagem do início e modelos).
2. **Ligar uma conta Gmail** com uma password de aplicação e enviar um e-mail de teste a um lead que seja outro e-mail teu. Depois responde-lhe a partir desse e-mail e carrega em "Ver e-mails novos".
3. **Commit e push.** Até ao próximo deploy, o cron recebe 404 de 5 em 5 minutos, o que não tem consequências.
4. **Para depois:**
   - pôr a página E-mails no tutorial;
   - limpar ficheiros esquecidos no Storage quando alguém fecha a página a meio de um carregamento;
   - subir o `MAX_EMPRESA` quando houver Supabase Pro.
