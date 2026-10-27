import { RedeView } from "./RedeView";
import { RedeVinculos } from "./RedeVinculos";
import { RedeMarketing } from "./RedeMarketing";
import { RedeCampanhas } from "./RedeCampanhas";

export const metadata = { title: "Rede de Orbibox" };

export default function RedePage() {
  return (
    <>
      <RedeVinculos />
      <RedeCampanhas />
      <RedeMarketing />
      <RedeView />
    </>
  );
}
