import { RedeView } from "./RedeView";
import { RedeVinculos } from "./RedeVinculos";
import { RedeMarketing } from "./RedeMarketing";

export const metadata = { title: "Rede de Orbibox" };

export default function RedePage() {
  return (
    <>
      <RedeVinculos />
      <RedeMarketing />
      <RedeView />
    </>
  );
}
