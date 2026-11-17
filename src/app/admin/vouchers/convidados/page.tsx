import Link from "next/link";

const COR = "#C4143A";

const CRIA = [
  { t: "Crie o voucher como Só convidados", d: "No assistente, escolha Só convidados no passo 2. O voucher não aparece na sua página e ninguém consegue pegar sem convite." },
  { t: "Suba a lista de pessoas", d: "Depois de publicar, abra o voucher e toque em Adicionar pessoas. Cole nome e WhatsApp, uma pessoa por linha, direto de uma planilha. Sem lista, gere só os códigos." },
  { t: "Envie o link de cada pessoa", d: "Cada convidado tem link e código próprios. Toque em Enviar no WhatsApp ou copie o link. A quantidade de vagas acompanha a lista." },
  { t: "Acompanhe e confirme no balcão", d: "Veja quem está aguardando, liberou ou já usou. No atendimento, digite o código: o nome do convidado aparece para você conferir com um documento." },
];

const RECEBE = [
  { t: "Abre o link do convite", d: "A página mostra o voucher e já preenche o código." },
  { t: "Confirma que é a pessoa", d: "Digita o WhatsApp em que recebeu o convite. Quem recebeu o link repassado não tem esse número e não consegue liberar." },
  { t: "Mostra o código no atendimento", d: "O voucher fica salvo no aparelho, com código e QR. Vale uma vez só e é pessoal." },
];

const PERGUNTAS = [
  { p: "E se alguém repassar o link para um amigo?", r: "O amigo precisa do número de WhatsApp da lista. Errou 5 vezes, o convite bloqueia e você decide se libera de novo." },
  { p: "E se a pessoa trocar de celular?", r: "No painel, toque em Liberar outro aparelho no convite dela. O mesmo código volta a funcionar, sem gastar outra vaga." },
  { p: "Onde fica a lista de convidados?", r: "Dentro do voucher, em Convites do voucher. Lá você adiciona pessoas, vê a situação de cada uma e baixa tudo em CSV." },
];

function Passos({ itens, cor }: { itens: { t: string; d: string }[]; cor: string }) {
  return (
    <ol className="mt-3 flex flex-col gap-3">
      {itens.map((p, i) => (
        <li key={p.t} className="flex gap-3.5 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full text-[15px] font-bold text-white" style={{ backgroundColor: cor }} aria-hidden>{i + 1}</span>
          <div className="min-w-0">
            <h3 className="text-[15.5px] font-semibold leading-snug">{p.t}</h3>
            <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">{p.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ConvidadosPage() {
  return (
    <div className="flex flex-col pb-10">
      <Link href="/admin/vouchers?novo=1" className="mt-2 inline-flex min-h-[44px] items-center text-[14px] text-text-tertiary hover:underline">← Voltar</Link>

      <div className="mt-2 rounded-[28px] p-5 text-white" style={{ backgroundImage: "linear-gradient(135deg, #A80F2B 0%, #CC1739 55%, #E4264C 100%)" }}>
        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11.5px] font-bold uppercase tracking-wide">Novo</span>
        <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[27px] font-semibold leading-[1.15] tracking-[-0.015em]">Voucher só para convidados</h1>
        <p className="mt-2 text-[14.5px] leading-snug text-white/90">Um grupo fechado, uma lista de pessoas, um link e um código para cada uma. Ideal para parcerias, clubes e ações para clientes especiais.</p>
      </div>

      <h2 className="mt-7 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Para quem cria</h2>
      <Passos itens={CRIA} cor={COR} />

      <h2 className="mt-7 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Para quem recebe</h2>
      <Passos itens={RECEBE} cor="#0B6B5C" />

      <h2 className="mt-7 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Dúvidas comuns</h2>
      <div className="mt-3 flex flex-col gap-3">
        {PERGUNTAS.map((q) => (
          <div key={q.p} className="rounded-[22px] p-4" style={{ backgroundColor: "#FCE8EC" }}>
            <p className="text-[14.5px] font-semibold" style={{ color: COR }}>{q.p}</p>
            <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">{q.r}</p>
          </div>
        ))}
      </div>

      <Link href="/admin/vouchers?novo=1" className="mt-7 flex min-h-[54px] w-full items-center justify-center rounded-full text-[15px] font-semibold text-white active:scale-[0.98]" style={{ backgroundColor: COR }}>Criar voucher para convidados</Link>
    </div>
  );
}
