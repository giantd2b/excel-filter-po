"use client";

import { MessageSquare } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
      <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
      <p className="text-sm text-gray-400">
        Choose a chat from the list to start messaging
      </p>
    </div>
  );
}
