import type { ReactNode } from "react";

export type PhoneFrameProps = {
  children: ReactNode;
};

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <section
      aria-label="Customer mobile phone"
      className="relative h-[780px] w-[420px] flex-none rounded-[58px] bg-[#1b1b1f] p-[12px] shadow-[var(--shadow-2xl)]"
    >
      <div className="dark relative flex h-full w-full flex-col overflow-hidden rounded-[47px] bg-black text-[var(--foreground)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[11px] left-1/2 z-20 h-[32px] w-[112px] -translate-x-1/2 rounded-[20px] bg-black shadow-[0_0_0_1.5px_var(--secondary)]"
        />
        {children}
      </div>
    </section>
  );
}
