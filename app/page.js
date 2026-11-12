import BarraTopo from "@/components/BarraTopo";
import Rodape from "@/components/Rodape";
import Destaque from "@/components/landing/Destaque";
import Problema from "@/components/landing/Problema";
import Funcionalidades from "@/components/landing/Funcionalidades";
import Vantagens from "@/components/landing/Vantagens";
import ComoFunciona from "@/components/landing/ComoFunciona";
import Perguntas from "@/components/landing/Perguntas";
import ChamadaFinal from "@/components/landing/ChamadaFinal";

// Landing page (rota "/"): a primeira página que um visitante vê.
// É um componente de servidor: o HTML é gerado no servidor e chega pronto ao browser.
// A ordem das secções responde, por ordem, às perguntas de quem chega:
// o que é? -> que problema resolve? -> o que faz? -> porquê usar? -> como começo? -> dúvidas
export default function Inicio() {
  return (
    <>
      <BarraTopo />
      <main>
        <Destaque />
        <Problema />
        <Funcionalidades />
        <Vantagens />
        <ComoFunciona />
        <Perguntas />
        <ChamadaFinal />
      </main>
      <Rodape />
    </>
  );
}
