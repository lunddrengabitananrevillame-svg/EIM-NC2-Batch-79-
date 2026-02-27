import { useEffect, useState } from "react";
import { formatCurrency } from "../lib/utils";
import {
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

interface Stats {
  totalCollected: number;
  totalSpent: number;
  balance: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data));
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Collected</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalCollected)}
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Spent</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Remaining Balance
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.balance)}
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" />
            Recent Activity
          </h3>
          <p className="text-sm text-gray-500">
            Check the Audit Logs page for full history.
          </p>
          {/* Could fetch recent logs here specifically if needed */}
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/contributions"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center text-sm font-medium text-gray-700"
            >
              Add Contribution
            </a>
            <a
              href="/expenses"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center text-sm font-medium text-gray-700"
            >
              Log Expense
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
