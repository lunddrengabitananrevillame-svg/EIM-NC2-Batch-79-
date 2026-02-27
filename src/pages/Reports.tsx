import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "../lib/utils";
import { Contribution, Expense, Member, Payment } from "../types";
import { Printer } from "lucide-react";

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

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </button>
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
        <div className="grid grid-cols-3 gap-4">
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
