"use client";

import { useEffect, useRef } from "react";

/**
 * A Orbi — esfera em vídeo (render 3D real, hospedado em /public). O contorno
 * orgânico e o brilho de vidro continuam em CSS, recortando e realçando o
 * vídeo por cima. Ajustes de reprodução minimizam as travadas do loop.
 */
export function OrbiOrb({ size = 96, className = "" }: { size?: number; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Garante que o vídeo esteja sempre tocando (alguns navegadores pausam ao
    // sair/voltar da aba) e reinicia o loop de forma suave, sem o "engasgo"
    // que acontece quando o navegador espera o fim exato pra recomeçar.
    v.playbackRate = 1;
    const play = () => { v.play().catch(() => {}); };
    play();
    const onVisibility = () => { if (!document.hidden) play(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      className={`orbi-orb relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <video
        ref={videoRef}
        src="/orbi-orb.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        className="h-full w-full object-cover"
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      />
    </div>
  );
}
