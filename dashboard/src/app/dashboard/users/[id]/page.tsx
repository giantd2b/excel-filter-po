"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import MessageList from "@/components/MessageList";

interface UserDetail {
  id: string;
  userId: string;
  displayName: string;
  pictureUrl: string;
  profile_pic: string;
  channel: string;
  timestamp: number;
  lastmessagetime: number;
  lastmessage: Array<{
    id: string;
    text: string;
    timesent: number;
  }>;
  first_name?: string;
  last_name?: string;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserDetailPage() {
  const params = useParams();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchUser(params.id as string);
    }
  }, [params.id]);

  const fetchUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูล User ได้");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <Link
          href="/dashboard/users"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          &larr; กลับไปรายชื่อ Users
        </Link>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || "ไม่พบข้อมูล User"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/users"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; กลับไปรายชื่อ Users
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              {user.pictureUrl || user.profile_pic ? (
                <Image
                  src={user.pictureUrl || user.profile_pic}
                  alt={user.displayName || "User"}
                  width={120}
                  height={120}
                  className="rounded-full mx-auto mb-4 object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-300 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl text-gray-600">
                    {user.displayName?.charAt(0) || "?"}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-800">
                {user.displayName ||
                  `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                  "ไม่ระบุชื่อ"}
              </h2>
              <span
                className={`mt-2 px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  user.channel?.startsWith("Line")
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {user.channel || "-"}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <p className="text-sm text-gray-500">User ID</p>
                <p className="text-sm text-gray-800 break-all">{user.userId || user.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">เข้าร่วมเมื่อ</p>
                <p className="text-sm text-gray-800">
                  {formatDate(user.timestamp)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ข้อความล่าสุด</p>
                <p className="text-sm text-gray-800">
                  {formatDate(user.lastmessagetime)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">จำนวนข้อความ</p>
                <p className="text-sm text-gray-800">
                  {user.lastmessage?.length || 0} ข้อความ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              ประวัติข้อความ
            </h3>
            <MessageList messages={user.lastmessage || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
