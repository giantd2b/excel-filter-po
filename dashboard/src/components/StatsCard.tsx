interface StatsCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: "blue" | "green" | "purple" | "orange";
}

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

export default function StatsCard({
  title,
  value,
  icon,
  color = "blue",
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center">
        <div
          className={`${colorClasses[color]} rounded-full p-3 text-white text-2xl`}
        >
          {icon || "📊"}
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
