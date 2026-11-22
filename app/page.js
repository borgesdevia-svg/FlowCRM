import BarraTopo from "@/components/BarraTopo";
import Rodape from "@/components/Rodape";
import Destaque from "@/components/landing/Destaque";
import Problema from "@/components/landing/Problema";
import Tour from "@/components/landing/Tour";
import Funcionalidades from "@/components/landing/Funcionalidades";
import ComoFunciona from "@/components/landing/ComoFunciona";
import Precos from "@/components/landing/Precos";
import Perguntas from "@/components/landing/Perguntas";
import ChamadaFinal from "@/components/landing/ChamadaFinal";

// Landing page (rota "/"): a primeira página que um visitante vê.
// É um componente de servidor: o HTML é gerado no servidor e chega pronto ao browser.
// A ordem das secções responde, por ordem, às perguntas de quem chega:
// o que é e como é por dentro? -> que problema resolve? -> o que faz? -> como começo?
// -> quanto custa (e o que tem cada plano)? -> dúvidas -> chamada final
// Os layouts alternam (centrado, linhas texto/imagem, grelha de cartões, planos lado a lado)
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
        <Precos />
        <Perguntas />
        <ChamadaFinal />
      </main>
      <Rodape />
    </>
  );
}
