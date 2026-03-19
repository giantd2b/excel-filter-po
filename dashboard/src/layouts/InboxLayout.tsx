import { Outlet } from "react-router-dom";

export default function InboxLayout() {
  return (
    <div className="h-full overflow-hidden">
      <Outlet />
    </div>
  );
}
