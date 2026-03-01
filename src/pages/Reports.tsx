import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "../lib/utils";
import { Contribution, Expense, Member, Payment } from "../types";
import { Printer, Download, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Reports() {
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalSpent: 0,
    balance: 0,
  });
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    // Poll every 2 seconds to automatically detect new data and regenerate the QR code dynamically
    const intervalId = setInterval(fetchData, 2000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchData = async () => {
    const t = Date.now();
    const [statsRes, contRes, expRes, payRes, logsRes] = await Promise.all([
      fetch(`/api/stats?t=${t}`),
      fetch(`/api/contributions?t=${t}`),
      fetch(`/api/expenses?t=${t}`),
      fetch(`/api/payments?t=${t}`),
      fetch(`/api/logs?t=${t}`),
    ]);

    setStats(await statsRes.json());
    setContributions(await contRes.json());
    setExpenses(await expRes.json());
    setPayments(await payRes.json());
    setLogs(await logsRes.json());
  };

  const handlePrint = () => {
    window.print();
  };

  // Use the Shared App URL so the QR code can be scanned by mobile devices without Google Auth
  const baseUrl = "https://ais-pre-azwavel6gq63z7hbcbyjcd-14552172691.asia-southeast1.run.app";
  
  // Use the ID of the latest log entry to guarantee the QR code updates instantly when ANY data changes
  const latestLogId = logs.length > 0 ? logs[0].id : 0;
  
  // Append a comprehensive dynamic hash so the QR code automatically regenerates whenever ANY data changes
  const dataHash = `${stats.totalCollected}_${stats.totalSpent}_${latestLogId}_${payments.length}_${expenses.length}_${contributions.length}`;
  const downloadUrl = `${baseUrl}/api/reports/excel?v=${dataHash}`;

  const expensesByCategory = React.useMemo(() => {
    const data = expenses.reduce((acc, curr) => {
      const existing = acc.find((item) => item.name === curr.category);
      if (existing) {
        existing.value += curr.total_cost;
      } else {
        acc.push({ name: curr.category, value: curr.total_cost });
      }
      return acc;
    }, [] as { name: string; value: number }[]);
    return data.sort((a, b) => b.value - a.value);
  }, [expenses]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const monthlyData = React.useMemo(() => {
    const monthlyMap = new Map<string, { month: string; contributions: number; expenses: number; timestamp: number }>();

    payments.forEach((p) => {
      const d = new Date(p.date_paid);
      const monthYear = d.toLocaleDateString("en-PH", { month: "short", year: "numeric", timeZone: "Asia/Manila" });
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { month: monthYear, contributions: 0, expenses: 0, timestamp: d.getTime() });
      }
      monthlyMap.get(key)!.contributions += p.amount_paid;
    });

    expenses.forEach((e) => {
      const d = new Date(e.date_purchased);
      const monthYear = d.toLocaleDateString("en-PH", { month: "short", year: "numeric", timeZone: "Asia/Manila" });
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { month: monthYear, contributions: 0, expenses: 0, timestamp: d.getTime() });
      }
      monthlyMap.get(key)!.expenses += e.total_cost;
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [payments, expenses]);

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <div className="flex gap-2">
          <a
            href={downloadUrl}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </a>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Report Header (Visible in Print) */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold">EIM Fund Manager Report</h1>
        <p className="text-sm text-gray-500">
          Generated on: {new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
        </p>
      </div>

      {/* Financial Summary */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:border-none print:shadow-none print:p-0">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">
          Financial Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg print:bg-transparent print:p-0">
            <p className="text-sm text-green-600 font-medium">
              Total Collected
            </p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(stats.totalCollected)}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg print:bg-transparent print:p-0">
            <p className="text-sm text-red-600 font-medium">Total Spent</p>
            <p className="text-2xl font-bold text-red-700">
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg print:bg-transparent print:p-0">
            <p className="text-sm text-blue-600 font-medium">
              Remaining Balance
            </p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(stats.balance)}
            </p>
          </div>
        </div>
      </section>

      {/* Financial Visualizations */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Contributions vs. Expenses (Monthly)</h2>
          <div className="h-72">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `₱${val}`} />
                  <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value: number) => formatCurrency(value)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="contributions" name="Contributions" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Expenses by Category</h2>
          <div className="h-72">
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No expenses recorded</div>
            )}
          </div>
        </div>
      </section>

      {/* Live Data QR Code */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:break-inside-avoid">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              Live Data Access
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Scan this QR code to download the latest updated Excel report containing all fund data (Members, Contributions, Payments, Expenses, and Logs).
            </p>
            <p className="text-xs text-gray-400">
              This report is generated in real-time and reflects the current state of the database.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center gap-2">
            <div style={{ height: "auto", margin: "0 auto", maxWidth: 128, width: "100%" }}>
              <QRCode
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={downloadUrl}
                viewBox={`0 0 256 256`}
              />
            </div>
            <span className="text-xs font-mono text-gray-500 mt-2">Scan to Download</span>
          </div>
        </div>
      </section>

      {/* Contributions Breakdown */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:border-none print:shadow-none print:p-0">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">
          Contributions Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2">Title</th>
                <th className="py-2">Due Date</th>
                <th className="py-2 text-right">Amount/Person</th>
                <th className="py-2 text-right">Collected</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => {
                const collected = payments
                  .filter((p) => p.contribution_id === c.id)
                  .reduce((sum, p) => sum + p.amount_paid, 0);
                return (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{c.title}</td>
                    <td className="py-2 text-gray-500">
                      {formatDate(c.due_date)}
                    </td>
                    <td className="py-2 text-right">
                      {formatCurrency(c.amount_per_person)}
                    </td>
                    <td className="py-2 text-right font-medium text-green-600">
                      {formatCurrency(collected)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expenses Breakdown */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:border-none print:shadow-none print:p-0">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">
          Expenses Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2">Date</th>
                <th className="py-2">Item</th>
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">
                    {formatDate(e.date_purchased)}
                  </td>
                  <td className="py-2 font-medium">{e.item_name}</td>
                  <td className="py-2 text-gray-500">{e.category}</td>
                  <td className="py-2 text-right font-medium text-red-600">
                    {formatCurrency(e.total_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      <div className="hidden print:block mt-8 text-center text-xs text-gray-400 border-t pt-4">
        <p>&copy; {new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric" })} EIM Fund Manager. All rights reserved.</p>
        <p>Created by LUNDDREN REVILLAME (EIM Batch 79)</p>
      </div>
    </div>
  );
}
