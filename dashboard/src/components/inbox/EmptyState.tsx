import { MessageCircle } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50/30">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-5 shadow-sm border border-slate-100/80">
        <MessageCircle className="w-7 h-7 text-slate-300" />
      </div>
      <h3 className="text-[15px] font-semibold text-slate-700 mb-1.5 tracking-[-0.01em]">
        Select a conversation
      </h3>
      <p className="text-[13px] text-slate-400 max-w-[260px] text-center leading-relaxed">
        Choose a chat from the list to start messaging
      </p>
    </div>
  );
}
