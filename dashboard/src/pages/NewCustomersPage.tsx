import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SkeletonTable from "@/components/SkeletonTable";
import { getNewUsers, NewUser } from "@/lib/api-service";

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

function timeAgo(timestamp: number): string {
  if (!timestamp) return "-";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "เมื่อสักครู่";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(seconds / 86400)} วันที่แล้ว`;
}

export default function NewCustomersPage() {
  const [users, setUsers] = useState<NewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchNewUsers();
  }, [days]);

  const fetchNewUsers = async () => {
    try {
      setLoading(true);
      const data = await getNewUsers(days, 100);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลลูกค้าใหม่ได้");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          ลูกค้าที่ทักมาครั้งแรก
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">แสดงภายใน:</span>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value={1}>24 ชั่วโมง</option>
            <option value={3}>3 วัน</option>
            <option value={7}>7 วัน</option>
            <option value={14}>14 วัน</option>
            <option value={30}>30 วัน</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 rounded-lg p-4">
          <p className="text-sm text-green-600">ลูกค้าใหม่ทั้งหมด</p>
          <p className="text-2xl font-bold text-green-800">{total}</p>
        </div>
        <div className="bg-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-600">ทักครั้งแรก (1 ข้อความ)</p>
          <p className="text-2xl font-bold text-blue-800">
            {users.filter((u) => u.isFirstTime).length}
          </p>
        </div>
        <div className="bg-purple-100 rounded-lg p-4">
          <p className="text-sm text-purple-600">กลับมาทักซ้ำ</p>
          <p className="text-2xl font-bold text-purple-800">
            {users.filter((u) => !u.isFirstTime).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} />
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ลูกค้า
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ช่องทาง
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ข้อความแรก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    เวลาที่ทัก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.pictureUrl ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={user.pictureUrl}
                              alt={user.displayName}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 text-sm">
                                {user.displayName?.charAt(0) || "?"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {timeAgo(user.timestamp)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.channel?.startsWith("Line")
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.channel || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {user.firstMessage || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isFirstTime ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          ใหม่ (ครั้งแรก)
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                          {user.messageCount} ข้อความ
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/dashboard/users/${user.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        ดูรายละเอียด
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            ไม่มีลูกค้าใหม่ในช่วง {days} วันที่ผ่านมา
          </div>
        )}
      </div>
    </div>
  );
}
