import { redirect } from "next/navigation";

// O Feed virou parte da Vitrine — mantemos o link antigo funcionando.
export default function ContentRedirect() {
  redirect("/admin/vitrine");
}
