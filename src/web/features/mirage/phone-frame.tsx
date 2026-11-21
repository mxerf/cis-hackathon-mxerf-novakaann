import type { ReactNode } from "react";

export type PhoneFrameProps = {
  children: ReactNode;
};

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[2.75rem] border-[6px] border-slate-800 bg-slate-900 p-2 shadow-2xl shadow-black/60">
      <div className="mx-auto mb-2 h-5 w-28 rounded-full bg-slate-950" />
      <div className="h-[680px] overflow-hidden rounded-[2rem] bg-white">{children}</div>
    </div>
  );
}
