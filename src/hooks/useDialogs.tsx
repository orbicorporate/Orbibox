"use client";

import { useCallback, useState } from "react";

type ConfirmOptions = { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type PromptOptions = { title: string; placeholder?: string; initialValue?: string; confirmLabel?: string; cancelLabel?: string };
type AlertOptions = { title?: string; message: string; okLabel?: string };

type DialogState =
  | { type: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { type: "prompt"; options: PromptOptions; resolve: (v: string | null) => void }
  | { type: "alert"; options: AlertOptions; resolve: () => void }
  | null;

/**
 * Substitui window.confirm/prompt/alert (as caixinhas nativas do navegador,
 * fora do padrão visual do app) por um modal com a cara do Orbibox. Uso:
 * const { confirm, prompt, alert, DialogRenderer } = useDialogs();
 * const ok = await confirm("Excluir isso?");
 * Monta <DialogRenderer /> uma vez, em qualquer lugar da árvore do componente.
 */
export function useDialogs() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState("");

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts: ConfirmOptions = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setDialog({ type: "confirm", options: opts, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions | string, initialValue?: string) => {
    const opts: PromptOptions = typeof options === "string" ? { title: options, initialValue } : options;
    setInputValue(opts.initialValue ?? "");
    return new Promise<string | null>((resolve) => {
      setDialog({ type: "prompt", options: opts, resolve });
    });
  }, []);

  const alertFn = useCallback((options: AlertOptions | string) => {
    const opts: AlertOptions = typeof options === "string" ? { message: options } : options;
    return new Promise<void>((resolve) => {
      setDialog({ type: "alert", options: opts, resolve });
    });
  }, []);

  function close() {
    setDialog(null);
  }

  function DialogRenderer() {
    if (!dialog) return null;
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6"
        onClick={() => {
          if (dialog.type === "confirm") dialog.resolve(false);
          else if (dialog.type === "prompt") dialog.resolve(null);
          else dialog.resolve();
          close();
        }}
      >
        <div
          className="w-full max-w-[340px] rounded-[24px] bg-surface-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          onClick={(e) => e.stopPropagation()}
        >
          {dialog.type === "confirm" && (
            <>
              {dialog.options.title && (
                <p className="font-[family-name:var(--font-manrope)] text-[17px] font-medium">{dialog.options.title}</p>
              )}
              <p className={`text-[13.5px] leading-relaxed text-text-secondary ${dialog.options.title ? "mt-1.5" : ""}`}>
                {dialog.options.message}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => { dialog.resolve(false); close(); }}
                  className="flex-1 rounded-full bg-surface-soft px-4 py-2.5 text-[13px] font-medium"
                >
                  {dialog.options.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  onClick={() => { dialog.resolve(true); close(); }}
                  className={`flex-1 rounded-full px-4 py-2.5 text-[13px] font-medium text-white ${dialog.options.danger ? "bg-red-600" : "bg-button-primary"}`}
                >
                  {dialog.options.confirmLabel ?? "Confirmar"}
                </button>
              </div>
            </>
          )}

          {dialog.type === "prompt" && (
            <>
              <p className="font-[family-name:var(--font-manrope)] text-[17px] font-medium">{dialog.options.title}</p>
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={dialog.options.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { dialog.resolve(inputValue); close(); }
                }}
                className="mt-3 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { dialog.resolve(null); close(); }}
                  className="flex-1 rounded-full bg-surface-soft px-4 py-2.5 text-[13px] font-medium"
                >
                  {dialog.options.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  onClick={() => { dialog.resolve(inputValue); close(); }}
                  className="flex-1 rounded-full bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white"
                >
                  {dialog.options.confirmLabel ?? "OK"}
                </button>
              </div>
            </>
          )}

          {dialog.type === "alert" && (
            <>
              {dialog.options.title && (
                <p className="font-[family-name:var(--font-manrope)] text-[17px] font-medium">{dialog.options.title}</p>
              )}
              <p className={`text-[13.5px] leading-relaxed text-text-secondary ${dialog.options.title ? "mt-1.5" : ""}`}>
                {dialog.options.message}
              </p>
              <button
                onClick={() => { dialog.resolve(); close(); }}
                className="mt-4 w-full rounded-full bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white"
              >
                {dialog.options.okLabel ?? "Entendi"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return { confirm, prompt, alert: alertFn, DialogRenderer };
}
