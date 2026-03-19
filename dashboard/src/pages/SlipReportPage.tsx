import { useEffect, useState } from "react";
import StatsCard from "@/components/StatsCard";
import { getSlipsByDate, SlipRecord } from "@/lib/api-service";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(timestamp: any): string {
  const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SkeletonTable() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-gray-300 h-12 w-12"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex space-x-4 mb-4">
            <div className="h-4 bg-gray-200 rounded w-8"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SlipReportPage() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [slips, setSlips] = useState<SlipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSlips();
  }, [selectedDate]);

  const fetchSlips = async () => {
    setLoading(true);
    setError("");
    try {
      const date = new Date(selectedDate + "T00:00:00+07:00");
      const data = await getSlipsByDate(date);
      setSlips(data);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลสลิปได้");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = slips.reduce((sum, s) => sum + (s.amount || 0), 0);
  const uniqueBanks = new Set(slips.map((s) => s.bank_name).filter(Boolean)).size;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">รายงานสลิป</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonTable />
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="สลิปทั้งหมด"
              value={`${slips.length} รายการ`}
              icon="🧾"
              color="blue"
            />
            <StatsCard
              title="ยอดรวม"
              value={`${formatAmount(totalAmount)} บาท`}
              icon="💰"
              color="green"
            />
            <StatsCard
              title="จำนวนธนาคาร"
              value={`${uniqueBanks} ธนาคาร`}
              icon="🏦"
              color="purple"
            />
          </div>

          {/* Slip Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ลำดับ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      เวลา
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ธนาคาร
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      จำนวนเงิน
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ผู้โอน
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ผู้รับ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      อ้างอิง
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ลิงก์
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {slips.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        ไม่มีสลิปในวันที่เลือก
                      </td>
                    </tr>
                  ) : (
                    slips.map((slip, index) => (
                      <tr key={slip.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {slip.detected_at ? formatTime(slip.detected_at) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {slip.bank_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                          {slip.amount != null
                            ? formatAmount(slip.amount)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {slip.sender_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {slip.receiver_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                          {slip.reference_number || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {slip.link ? (
                            <a
                              href={slip.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              ดูสลิป
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
