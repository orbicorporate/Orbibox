import { redirect } from "next/navigation";

// Contatos agora ficam dentro de "Sua marca", numa seção que abre sozinha.
export default function ConfigContatosPage() {
  redirect("/admin/config/marca#contatos");
}
