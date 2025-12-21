interface Message {
  id: string;
  text: string;
  timesent: number;
}

interface MessageListProps {
  messages: Message[];
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageList({ messages }: MessageListProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">ไม่มีประวัติข้อความ</div>
    );
  }

  const sortedMessages = [...messages].sort(
    (a, b) => b.timesent - a.timesent
  );

  return (
    <div className="space-y-3">
      {sortedMessages.map((msg, index) => (
        <div
          key={msg.id || index}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <p className="text-gray-800">{msg.text}</p>
          <p className="text-xs text-gray-500 mt-2">
            {formatDate(msg.timesent)}
          </p>
        </div>
      ))}
    </div>
  );
}
