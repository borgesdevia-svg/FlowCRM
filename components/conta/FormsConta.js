"use client";
// Os formulários da página "A minha conta" (perfil, texto do e-mail e password).
// Cada um tem o seu useActionState, ligado à sua Server Action.

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { mudarPerfil, mudarModeloEmail, mudarPassword } from "@/lib/acoes/conta";
import { ligarContaEmail, desligarContaEmail } from "@/lib/acoes/email";
import { MAX_MODELO_EMAIL, VARIAVEIS_EMAIL } from "@/lib/linkEmail";
import { ATALHOS, AVISO_MICROSOFT, LINK_PASSWORD_APP_GMAIL, MAX, dominioBloqueado } from "@/lib/email/servidores";
import CampoPassword from "@/components/CampoPassword";

const estiloForm = { display: "flex", flexDirection: "column", gap: 14 };
const estiloBotao = { alignSelf: "flex-start" };
const estiloLinha = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 };

// mensagem de erro ou de sucesso devolvida pela action
function Mensagem({ estado }) {
  if (estado.erro) return <p className="alerta alerta-erro" role="alert">{estado.erro}</p>;
  if (estado.sucesso) return <p className="alerta alerta-sucesso" role="status">{estado.sucesso}</p>;
  return null;
}

export function FormPerfil({ perfil }) {
  const [estado, accao, pendente] = useActionState(mudarPerfil, {});
  const v = estado.valores ?? perfil;

  return (
    <form action={accao} style={estiloForm}>
      <Mensagem estado={estado} />
      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" autoComplete="name" defaultValue={v.nome ?? ""} required />
      </div>
      <div style={estiloLinha}>
        <div className="campo">
          <label htmlFor="cargo">Cargo (opcional)</label>
          <input id="cargo" name="cargo" maxLength={60} placeholder="Ex.: Comercial sénior" defaultValue={v.cargo ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="telefone">Telefone (opcional)</label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="+351 912 345 678"
            defaultValue={v.telefone ?? ""}
          />
        </div>
      </div>
      <button type="submit" className="botao" disabled={pendente} style={estiloBotao}>
        {pendente ? "A guardar..." : "Guardar perfil"}
      </button>
    </form>
  );
}

// Mensagem do início (página E-mails): o texto que a janela de escrever da ficha já traz escrito
// no início de todos os e-mails. Os botões das variáveis põem a palavra onde está o cursor (ex.: {nome}).
export function FormModeloEmail({ modelo }) {
  const [estado, accao, pendente] = useActionState(mudarModeloEmail, {});
  const caixa = useRef(null);
  const valor = estado.valores?.modelo ?? modelo ?? "";

  function inserir(chave) {
    const t = caixa.current;
    if (!t) return;
    t.focus();
    // setRangeText troca a seleção (ou põe no cursor) e deixa o cursor a seguir à palavra
    t.setRangeText(chave, t.selectionStart, t.selectionEnd, "end");
  }

  return (
    <form action={accao} style={estiloForm}>
      <Mensagem estado={estado} />
      <div className="campo">
        <label htmlFor="modelo-email">Mensagem do início</label>
        <textarea
          ref={caixa}
          id="modelo-email"
          name="modelo"
          rows={6}
          maxLength={MAX_MODELO_EMAIL}
          placeholder={"{saudacao}, {nome}.\n\nAqui fala o {eu}, da {empresa}.\n"}
          defaultValue={valor}
        />
      </div>
      <div style={estiloVariaveis} aria-label="Palavras que se preenchem sozinhas">
        {VARIAVEIS_EMAIL.map((v) => (
          <button key={v.chave} type="button" className="botao botao-secundario" style={estiloVariavel} onClick={() => inserir(v.chave)} title={v.descricao}>
            {v.chave}
          </button>
        ))}
      </div>
      <p style={estiloAjuda}>
        {VARIAVEIS_EMAIL.map((v) => `${v.chave} = ${v.descricao}`).join(" · ")}. Deixa vazio para a janela abrir sem texto.
      </p>
      <button type="submit" className="botao" disabled={pendente} style={estiloBotao}>
        {pendente ? "A guardar..." : "Guardar mensagem"}
      </button>
    </form>
  );
}

// ---------- ligar a conta de e-mail (SMTP/IMAP) ----------
// conta = a conta já ligada (sem password) ou null. Ao guardar, o servidor testa a ligação.
function BotaoDesligar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="botao botao-secundario" disabled={pending}>
      {pending ? "A desligar..." : "Desligar"}
    </button>
  );
}

export function FormContaEmail({ conta, nomePessoa }) {
  const [estado, accao, pendente] = useActionState(ligarContaEmail, {});
  const v = estado.valores ?? conta ?? {};
  const atalhoInicial = !conta || v.smtp_host === ATALHOS.gmail.smtp_host ? "gmail" : "outro";
  const [atalho, setAtalho] = useState(atalhoInicial);
  const [servidores, setServidores] = useState(() => ({
    ...ATALHOS[atalhoInicial],
    ...(v.smtp_host ? { smtp_host: v.smtp_host, smtp_porta: v.smtp_porta, imap_host: v.imap_host, imap_porta: v.imap_porta } : {}),
  }));
  const [email, setEmail] = useState(v.email ?? "");
  const aviso = dominioBloqueado(email);

  function escolher(chave) {
    setAtalho(chave);
    setServidores(chave === "outro" && atalho === "outro" ? servidores : { ...ATALHOS[chave] });
  }
  const mudar = (campo) => (e) => setServidores({ ...servidores, [campo]: e.target.value });

  return (
    <div style={estiloForm}>
      {conta ? (
        <div style={estiloEstado}>
          <p style={{ margin: 0 }}>
            Ligada a <strong>{conta.email}</strong>. Os e-mails aos leads saem desta conta.
          </p>
          <form action={desligarContaEmail}>
            <BotaoDesligar />
          </form>
        </div>
      ) : (
        <p style={estiloAjuda}>Ainda não ligaste a tua conta. Sem ela não dá para enviar e-mails aos leads pelo CRM.</p>
      )}

      <form action={accao} style={estiloForm}>
        <Mensagem estado={estado} />

        <div style={estiloVariaveis} role="radiogroup" aria-label="Fornecedor do e-mail">
          {[
            { chave: "gmail", texto: "Gmail" },
            { chave: "outro", texto: "Outro (e-mail da empresa)" },
          ].map((o) => (
            <button
              key={o.chave}
              type="button"
              role="radio"
              aria-checked={atalho === o.chave}
              className={atalho === o.chave ? "botao" : "botao botao-secundario"}
              style={estiloVariavel}
              onClick={() => escolher(o.chave)}
            >
              {o.texto}
            </button>
          ))}
        </div>

        {atalho === "gmail" && (
          <p style={estiloAjuda}>
            No Gmail usa uma password de aplicação, não a tua password normal. Liga a verificação em 2 passos e cria uma em{" "}
            <a href={LINK_PASSWORD_APP_GMAIL} target="_blank" rel="noopener noreferrer">
              myaccount.google.com/apppasswords
            </a>
            .
          </p>
        )}

        <div style={estiloLinha}>
          <div className="campo">
            <label htmlFor="ce-email">Email</label>
            <input
              id="ce-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={MAX.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(aviso)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="ce-nome">Nome que o lead vê</label>
            <input id="ce-nome" name="nome_remetente" maxLength={MAX.nome} defaultValue={v.nome_remetente ?? nomePessoa ?? ""} />
          </div>
        </div>
        {aviso && (
          <p className="erro-campo" role="alert">
            {AVISO_MICROSOFT}
          </p>
        )}

        <div className="campo">
          <label htmlFor="ce-password">{atalho === "gmail" ? "Password de aplicação" : "Password do e-mail"}</label>
          <CampoPassword
            id="ce-password"
            name="password"
            autoComplete="off"
            placeholder={conta ? "Deixa vazio para manter a que está guardada" : ""}
          />
        </div>

        {/* no Gmail os servidores ficam escondidos (já estão certos) */}
        {atalho === "outro" ? (
          <>
            <div style={estiloLinhaServidor}>
              <div className="campo">
                <label htmlFor="ce-smtp">Servidor de envio (SMTP)</label>
                <input id="ce-smtp" name="smtp_host" placeholder="mail.empresa.pt" value={servidores.smtp_host} onChange={mudar("smtp_host")} required />
              </div>
              <div className="campo">
                <label htmlFor="ce-smtp-porta">Porta</label>
                <input id="ce-smtp-porta" name="smtp_porta" inputMode="numeric" value={servidores.smtp_porta} onChange={mudar("smtp_porta")} required />
              </div>
            </div>
            <div style={estiloLinhaServidor}>
              <div className="campo">
                <label htmlFor="ce-imap">Servidor de receção (IMAP)</label>
                <input id="ce-imap" name="imap_host" placeholder="mail.empresa.pt" value={servidores.imap_host} onChange={mudar("imap_host")} required />
              </div>
              <div className="campo">
                <label htmlFor="ce-imap-porta">Porta</label>
                <input id="ce-imap-porta" name="imap_porta" inputMode="numeric" value={servidores.imap_porta} onChange={mudar("imap_porta")} required />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="ce-utilizador">Utilizador (se for diferente do email)</label>
              <input id="ce-utilizador" name="utilizador" maxLength={MAX.utilizador} defaultValue={v.utilizador && v.utilizador !== v.email ? v.utilizador : ""} />
            </div>
            <p style={estiloAjuda}>Os servidores e as portas vêm nas definições do teu fornecedor de e-mail (cPanel, PTisp, Hostinger, Zoho...).</p>
          </>
        ) : (
          <>
            <input type="hidden" name="smtp_host" value={ATALHOS.gmail.smtp_host} />
            <input type="hidden" name="smtp_porta" value={ATALHOS.gmail.smtp_porta} />
            <input type="hidden" name="imap_host" value={ATALHOS.gmail.imap_host} />
            <input type="hidden" name="imap_porta" value={ATALHOS.gmail.imap_porta} />
          </>
        )}

        <div className="campo">
          <label htmlFor="ce-assinatura">Assinatura</label>
          <textarea
            id="ce-assinatura"
            name="assinatura"
            rows={3}
            maxLength={MAX.assinatura}
            placeholder={"Rui Borges\nComercial · Clínica Sol\n912 345 678"}
            defaultValue={v.assinatura ?? ""}
          />
        </div>

        <button type="submit" className="botao" disabled={pendente || Boolean(aviso)} style={estiloBotao}>
          {pendente ? "A testar a ligação…" : conta ? "Guardar e testar" : "Ligar conta"}
        </button>
      </form>
    </div>
  );
}

const estiloEstado = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
const estiloLinhaServidor = { display: "grid", gridTemplateColumns: "1fr 90px", gap: 14 };

const estiloVariaveis = { display: "flex", flexWrap: "wrap", gap: 8 };
const estiloVariavel = { padding: "6px 10px", fontSize: "0.85rem" };
const estiloAjuda = { color: "var(--cor-texto-suave)", fontSize: "0.85rem", margin: 0 };

export function FormPassword() {
  const [estado, accao, pendente] = useActionState(mudarPassword, {});

  return (
    // key: depois de mudar com sucesso, os campos ficam vazios
    <form action={accao} key={estado.sucesso} style={estiloForm}>
      <Mensagem estado={estado} />
      {/* CampoPassword: caixa escondida com botão "Mostrar" */}
      <div className="campo">
        <label htmlFor="atual">Password atual</label>
        <CampoPassword id="atual" name="atual" autoComplete="current-password" />
      </div>
      <div className="campo">
        <label htmlFor="nova">Nova password</label>
        <CampoPassword id="nova" name="nova" autoComplete="new-password" />
      </div>
      <div className="campo">
        <label htmlFor="confirmacao">Repete a nova password</label>
        <CampoPassword id="confirmacao" name="confirmacao" autoComplete="new-password" />
      </div>
      <button type="submit" className="botao" disabled={pendente} style={estiloBotao}>
        {pendente ? "A mudar..." : "Mudar password"}
      </button>
    </form>
  );
}
