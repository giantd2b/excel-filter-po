import { useEffect, useState, useCallback, useRef } from "react";
import UserTable, { User } from "@/components/UserTable";
import SkeletonTable from "@/components/SkeletonTable";
import { getUsers } from "@/lib/api-service";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchUsers = useCallback(
    async (loadMore = false, searchText?: string, channel?: string) => {
      try {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const data = await getUsers(
          50,
          loadMore ? lastId : null,
          searchText,
          channel,
        );

        if (loadMore) {
          setUsers((prev) => [...prev, ...data.users]);
        } else {
          setUsers(data.users);
          if (!searchText && !channel) {
            const uniqueChannels = [
              ...new Set(data.users.map((u: User) => u.channel).filter(Boolean)),
            ] as string[];
            setChannels((prev) => {
              const merged = new Set([...prev, ...uniqueChannels]);
              return Array.from(merged).sort();
            });
          }
        }

        setHasMore(data.hasMore);
        setLastId(data.nextLastId);
      } catch (err) {
        setError("ไม่สามารถโหลดข้อมูล Users ได้");
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lastId]
  );

  // Initial load + fetch channels
  useEffect(() => {
    fetchUsers(false, "", "");
  }, []);

  // Debounced search
  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLastId(null);
      fetchUsers(false, value, channelFilter);
    }, 400);
  };

  const handleChannelChange = (value: string) => {
    setChannelFilter(value);
    setLastId(null);
    fetchUsers(false, search, value);
  };

  const handleClear = () => {
    setSearch("");
    setChannelFilter("");
    setLastId(null);
    fetchUsers(false, "", "");
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUsers(true, search, channelFilter);
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">รายชื่อ Users</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ค้นหา
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, เบอร์โทร, User ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ช่องทาง
            </label>
            <select
              value={channelFilter}
              onChange={(e) => handleChannelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">ทั้งหมด</option>
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-600 mb-4">
        แสดง {users.length} รายการ
        {hasMore && " (มีอีก)"}
      </p>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} />
        ) : users.length > 0 ? (
          <>
            <UserTable users={users} />
            {hasMore && (
              <div className="p-4 text-center border-t">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingMore ? "กำลังโหลด..." : "โหลดเพิ่มเติม"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">ไม่พบข้อมูล Users</div>
        )}
      </div>
    </div>
  );
}
