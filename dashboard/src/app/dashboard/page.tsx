"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import StatsCard from "@/components/StatsCard";
import SkeletonStats from "@/components/SkeletonStats";

interface Stats {
  totalUsers: number;
  lineUsers: number;
  fbUsers: number;
  channelStats: { [key: string]: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลสถิติได้");
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Dashboard Overview
      </h1>

      {loading ? (
        <SkeletonStats />
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Users ทั้งหมด"
              value={stats?.totalUsers || 0}
              icon="👥"
              color="blue"
            />
            <StatsCard
              title="LINE Users"
              value={stats?.lineUsers || 0}
              icon="💬"
              color="green"
            />
            <StatsCard
              title="Facebook Users"
              value={stats?.fbUsers || 0}
              icon="📘"
              color="purple"
            />
          </div>

          {/* Channel Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Users ต่อช่องทาง
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats?.channelStats &&
                Object.entries(stats.channelStats).map(([channel, count]) => (
                  <div
                    key={channel}
                    className="bg-gray-50 rounded-lg p-4 text-center"
                  >
                    <p className="text-sm text-gray-600">{channel}</p>
                    <p className="text-xl font-bold text-gray-800">{count}</p>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
