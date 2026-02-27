import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "../lib/utils";
import { Contribution, Expense, Member, Payment } from "../types";
import { Printer, Download, QrCode } from "lucide-react";
import QRCode from "react-qr-code";

export default function Reports() {
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalSpent: 0,
    balance: 0,
  });
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [statsRes, contRes, expRes, payRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/contributions"),
      fetch("/api/expenses"),
      fetch("/api/payments"),
    ]);

    setStats(await statsRes.json());
    setContributions(await contRes.json());
    setExpenses(await expRes.json());
    setPayments(await payRes.json());
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadUrl = `${window.location.origin}/api/reports/excel`;

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
          Generated on: {new Date().toLocaleDateString()}
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
        <p>&copy; {new Date().getFullYear()} EIM Fund Manager. All rights reserved.</p>
        <p>Created by LUNDDREN REVILLAME (EIM Batch 79)</p>
      </div>
    </div>
  );
}
