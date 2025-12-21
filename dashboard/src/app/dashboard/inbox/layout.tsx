export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden">{children}</div>
  );
}
