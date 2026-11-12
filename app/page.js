import BarraTopo from "@/components/BarraTopo";
import Rodape from "@/components/Rodape";
import Destaque from "@/components/landing/Destaque";
import Funcionalidades from "@/components/landing/Funcionalidades";
import ComoFunciona from "@/components/landing/ComoFunciona";
import ChamadaFinal from "@/components/landing/ChamadaFinal";

// Landing page (rota "/"): a primeira página que um visitante vê.
// É um componente de servidor: o HTML é gerado no servidor e chega pronto ao browser.
// Cada secção é um componente próprio em components/landing/, para o código ficar organizado.
export default function Inicio() {
  return (
    <>
      <BarraTopo />
      <main>
        <Destaque />
        <Funcionalidades />
        <ComoFunciona />
        <ChamadaFinal />
      </main>
      <Rodape />
    </>
  );
}
