import { MessageCircle } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50/30">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-5 shadow-sm">
        <MessageCircle className="w-7 h-7 text-indigo-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1.5">
        Select a conversation
      </h3>
      <p className="text-sm text-slate-400 max-w-[240px] text-center leading-relaxed">
        Choose a chat from the list to start messaging
      </p>
    </div>
  );
}
