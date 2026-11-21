import { ChevronLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale, SupportMessage } from "../../../shared/mirage-types.ts";
import { getUiCopy } from "../../lib/ui-copy.ts";

export type WalletSupportChatProps = {
  locale: Locale;
  messages: SupportMessage[];
  isBusy: boolean;
  onBack: () => void;
  onSendMessage: (text: string) => Promise<void>;
};

export function WalletSupportChat({
  locale,
  messages,
  isBusy,
  onBack,
  onSendMessage,
}: WalletSupportChatProps) {
  const copy = getUiCopy(locale);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    setDraft("");
    await onSendMessage(trimmed);
  }

  return (
    <div className="animate-mirage-fade flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--card)]"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <div className="text-[16px] font-bold text-[var(--foreground)]">{copy.supportTitle}</div>
          <div className="text-[12px] text-[var(--muted-foreground)]">{copy.supportSubtitle}</div>
        </div>
      </div>

      <div ref={scrollRef} className="mirage-scroll flex-1 space-y-2.5 overflow-y-auto pr-1 pb-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-mirage-rise max-w-[85%] rounded-[18px] px-3.5 py-2.5 text-[13.5px] leading-[1.4] ${
              msg.role === "user"
                ? "ml-auto rounded-br-[6px] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "mr-auto rounded-bl-[6px] bg-[var(--card)] text-[var(--foreground)]"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2 pt-1">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.supportPlaceholder}
          className="h-[44px] min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-[13.5px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={isBusy || draft.trim().length === 0}
          aria-label={copy.supportSend}
          className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition hover:brightness-105 disabled:opacity-45"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
