"use client";

import { useState } from "react";
import { QRCodeModal } from "./QRCodeModal";

export function QRCodeButton({ url, businessName, className, children }: { url: string; businessName: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <QRCodeModal url={url} businessName={businessName} onClose={() => setOpen(false)} />}
    </>
  );
}
