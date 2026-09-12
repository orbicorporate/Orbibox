"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={signingOut}
      className="rounded-full border border-divider bg-surface-white py-3 text-center text-[14px] text-red-600 disabled:opacity-50"
    >
      {signingOut ? "Saindo…" : "Sair da conta"}
    </button>
  );
}
