import Link from "next/link";
import BarraTopo from "@/components/BarraTopo";
import Rodape from "@/components/Rodape";
import MockupCRM from "@/components/MockupCRM";
import styles from "./page.module.css";

// Landing page (rota "/"): a primeira página que um visitante vê.
// É um componente de servidor: não tem interatividade, só mostra conteúdo,
// por isso o browser recebe HTML pronto (rápido e bom para motores de pesquisa).

// Ícones simples em SVG (desenho vetorial), sem bibliotecas externas
const icones = {
  clientes: (
    <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5.5-5-6.5" /></svg>
  ),
  pipeline: (
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /></svg>
  ),
  formulario: (
    <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
  ),
  email: (
    <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
  ),
};

const funcionalidades = [
  {
    icone: icones.clientes,
    titulo: "Clientes organizados",
    texto: "Contactos, estados e notas de cada cliente num só lugar. Pesquisa e filtra em segundos.",
  },
  {
    icone: icones.pipeline,
    titulo: "Pipeline de vendas",
    texto: "Acompanha cada negócio desde o primeiro contacto até se tornar cliente ativo.",
  },
  {
    icone: icones.formulario,
    titulo: "Formulário público",
    texto: "Cada empresa tem um link próprio. Quem o preenche entra logo como lead no CRM.",
  },
  {
    icone: icones.email,
    titulo: "Emails automáticos",
    texto: "Cada novo lead recebe um email de boas-vindas, sem ninguém ter de o enviar.",
  },
];

const passos = [
  { titulo: "Regista a tua empresa", texto: "Cria a conta em poucos minutos e ficas como administrador." },
  { titulo: "Junta a tua equipa", texto: "Adiciona os comerciais. Cada um vê os seus clientes; o admin vê todos." },
  { titulo: "Recebe e acompanha leads", texto: "Partilha o formulário público e segue tudo a partir do painel." },
];

export default function Inicio() {
  return (
    <>
      <BarraTopo />

      <main>
        {/* 1. Destaque principal */}
        <section className={styles.destaque}>
          <div className={styles.destaqueTexto}>
            <p className={styles.etiqueta}>CRM para pequenas equipas comerciais</p>
            <h1>
              Gere os teus clientes <span>num só lugar.</span>
            </h1>
            <p className={styles.descricao}>
              O FlowCRM junta clientes, pipeline de vendas e emails automáticos numa
              plataforma simples. Cada empresa tem o seu espaço, com os dados totalmente separados.
            </p>
            <div className={styles.botoes}>
              <Link href="/registo" className="botao">
                Criar conta da empresa
              </Link>
              <Link href="/login" className="botao botao-secundario">
                Já tenho conta
              </Link>
            </div>
          </div>

          <MockupCRM />
        </section>

        {/* 2. Funcionalidades (id usado pelo link "Funcionalidades" da barra de topo) */}
        <section id="funcionalidades" className={styles.seccao}>
          <h2>Tudo o que a tua equipa precisa</h2>
          <div className={styles.grelha}>
            {funcionalidades.map((f) => (
              <article key={f.titulo} className={styles.cartao}>
                <div className={styles.icone}>{f.icone}</div>
                <h3>{f.titulo}</h3>
                <p>{f.texto}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 3. Como funciona */}
        <section id="como-funciona" className={styles.seccao}>
          <h2>Como funciona</h2>
          <ol className={styles.passos}>
            {passos.map((p, indice) => (
              <li key={p.titulo}>
                <span className={styles.numero}>{indice + 1}</span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. Chamada final */}
        <section className={styles.seccao}>
          <div className={styles.chamada}>
            <h2>Pronto para começar?</h2>
            <p>Cria a conta da tua empresa e recebe o primeiro lead ainda hoje.</p>
            <Link href="/registo" className="botao">
              Criar conta grátis
            </Link>
          </div>
        </section>
      </main>

      <Rodape />
    </>
  );
}
