import BarraTopo from "@/components/BarraTopo";
import Rodape from "@/components/Rodape";
import Destaque from "@/components/landing/Destaque";
import Problema from "@/components/landing/Problema";
import Tour from "@/components/landing/Tour";
import Funcionalidades from "@/components/landing/Funcionalidades";
import Vantagens from "@/components/landing/Vantagens";
import ComoFunciona from "@/components/landing/ComoFunciona";
import Perguntas from "@/components/landing/Perguntas";
import ChamadaFinal from "@/components/landing/ChamadaFinal";

// Landing page (rota "/"): a primeira página que um visitante vê.
// É um componente de servidor: o HTML é gerado no servidor e chega pronto ao browser.
// A ordem das secções responde, por ordem, às perguntas de quem chega:
// o que é e como é por dentro? -> que problema resolve? -> o que faz? -> como começo?
// -> porquê usar? -> dúvidas -> chamada final
// Os layouts alternam (centrado, linhas texto/imagem, tabela, grelha de cartões)
// para a página não ficar repetitiva.
export default function Inicio() {
  return (
    <>
      <BarraTopo />
      <main>
        <Destaque />
        <Tour />
        <Problema />
        <Funcionalidades />
        <ComoFunciona />
        <Vantagens />
        <Perguntas />
        <ChamadaFinal />
      </main>
      <Rodape />
    </>
  );
}
