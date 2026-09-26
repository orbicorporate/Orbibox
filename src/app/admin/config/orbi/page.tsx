import { redirect } from "next/navigation";

// "O que a Orbi sabe" agora mora em Sua IA, no passo "Revise o que ela sabe".
export default function ConfigOrbiPage() {
  redirect("/admin/agent#o-que-sabe");
}
