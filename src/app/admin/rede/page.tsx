import { RedeView } from "./RedeView";
import { RedeVinculos } from "./RedeVinculos";

export const metadata = { title: "Rede de Orbibox" };

export default function RedePage() {
  return (
    <>
      <RedeVinculos />
      <RedeView />
    </>
  );
}
