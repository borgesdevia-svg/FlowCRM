// Símbolo do FlowCRM: um "F" feito de duas faixas curvas, como um fluxo
// (desenhado a partir de Referencias/logo.png). É um SVG, por isso fica nítido
// em qualquer tamanho. O texto "FlowCRM" ao lado é texto normal, não imagem.
//
// Uso: <SimboloLogo tamanho={22} className={styles.simbolo} />
export default function SimboloLogo({ tamanho = 22, className }) {
  return (
    <svg
      width={tamanho}
      height={Math.round((tamanho * 52) / 56)}
      viewBox="0 0 56 52"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* verde claro em cima à direita, mais escuro em baixo à esquerda */}
        <linearGradient id="flowcrm-gradiente" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3cf59a" />
          <stop offset="1" stopColor="#0fb257" />
        </linearGradient>
      </defs>
      <path
        fill="url(#flowcrm-gradiente)"
        d="M2.5 26.5C5 14 11 2 19 2H55C55 7 52 13 45 16C38 18.5 24 17 15 19.5C9 21 5 23.5 2.5 26.5Z"
      />
      <path
        fill="url(#flowcrm-gradiente)"
        d="M5 49C7 38 11 24 21 23.5H43C43 29 40 34 33 36.5C26 38.5 16 38 11 41.5C8 43.5 6 46 5 49Z"
      />
    </svg>
  );
}
