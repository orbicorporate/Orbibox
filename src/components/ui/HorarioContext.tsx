"use client";

import { createContext } from "react";
import type { Horario } from "@/lib/horario";

/** Horário de funcionamento do negócio, lido do botão de endereço. */
export const HorarioContext = createContext<Horario | null>(null);
