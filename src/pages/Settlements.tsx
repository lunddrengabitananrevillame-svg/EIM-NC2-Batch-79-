import React, { useEffect, useState } from "react";
import { formatCurrency } from "../lib/utils";
import { Search, ArrowUpDown, Calculator, CheckCircle2, AlertCircle } from "lucide-react";
import { Member, Expense, Payment } from "../types";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

interface SettlementSummary {
  memberId: number;
  memberName: string;
  totalPaid: number;
  fairShare: number;
  difference: number;
  status: "Refund" | "Remaining Balance" | "Settled";
}

export default function Settlements() {
  const { user } = useAuth();
  const [data, setData] = useState<SettlementSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    memberId: number;
    amount: number;
    type: 'Refund' | 'Payment';
  } | null>(null);

  // Only President can access this page
  if (user?.role !== "President") {
    return <Navigate to="/" replace />;
  }

  const fetchData = React.useCallback(async () => {
    try {
      const [membersRes, expensesRes, paymentsRes, settlementsRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/expenses"),
        fetch("/api/payments"),
        fetch("/api/settlements"),
      ]);

      const members: Member[] = await membersRes.json();
      const expenses: Expense[] = await expensesRes.json();
      const payments: Payment[] = await paymentsRes.json();
      const settlements: any[] = await settlementsRes.json();

      const totalExp = expenses.reduce((sum, e) => sum + e.total_cost, 0);
      setTotalExpenses(totalExp);

      // Calculate fair share per active member
      const activeMembers = members.filter(m => m.status === 'Active');
      const activeMemberCount = activeMembers.length > 0 ? activeMembers.length : 1;
      const fairShare = totalExp / activeMemberCount;

      const summary: SettlementSummary[] = members.map((member) => {
        const memberPayments = payments.filter((p) => p.member_id === member.id);
        const baseTotalPaid = memberPayments.reduce((sum, p) => sum + p.amount_paid, 0);
        
        const memberSettlements = settlements.filter((s) => s.member_id === member.id);
        const settlementAdjustments = memberSettlements.reduce((sum, s) => {
          return s.type === 'Payment' ? sum + s.amount : sum - s.amount;
        }, 0);

        const totalPaid = baseTotalPaid + settlementAdjustments;

        // Only active members share the expenses, inactive members have 0 fair share
        const memberFairShare = member.status === 'Active' ? fairShare : 0;
        const difference = totalPaid - memberFairShare;

        let status: "Refund" | "Remaining Balance" | "Settled" = "Settled";
        if (difference > 0.01) status = "Refund";
        else if (difference < -0.01) status = "Remaining Balance";

        return {
          memberId: member.id,
          memberName: member.name,
          totalPaid,
          fairShare: memberFairShare,
          difference,
          status,
        };
      });

      setData(summary);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSettle = async () => {
    if (!confirmModal) return;

    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: confirmModal.memberId,
          amount: confirmModal.amount,
          type: confirmModal.type,
          admin_id: user?.id,
          admin_name: user?.name,
        }),
      });

      if (res.ok) {
        fetchData();
        setConfirmModal(null);
      } else {
        console.error("Failed to record settlement");
        setConfirmModal(null);
      }
    } catch (error) {
      console.error("Error recording settlement:", error);
      setConfirmModal(null);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'name') {
          return sortConfig.direction === 'asc' 
            ? a.memberName.localeCompare(b.memberName)
            : b.memberName.localeCompare(a.memberName);
        }
        if (sortConfig.key === 'paid') {
          return sortConfig.direction === 'asc' ? a.totalPaid - b.totalPaid : b.totalPaid - a.totalPaid;
        }
        if (sortConfig.key === 'difference') {
          return sortConfig.direction === 'asc' ? a.difference - b.difference : b.difference - a.difference;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const filteredData = sortedData.filter((item) =>
    item.memberName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Settlements
          </h1>
          <p className="text-sm text-gray-500 mt-1">Calculate refunds and remaining balances based on total expenses.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search member..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Fund Expenses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Refunds to Issue</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(data.filter(d => d.status === 'Refund').reduce((sum, d) => sum + d.difference, 0))}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Remaining Balances to Collect</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(Math.abs(data.filter(d => d.status === 'Remaining Balance').reduce((sum, d) => sum + d.difference, 0)))}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[800px]">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th 
                  className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Member Name
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-gray-200 text-right">
                  Fair Share (Expenses)
                </th>
                <th 
                  className="px-6 py-4 border-b border-gray-200 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('paid')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Total Paid
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-gray-200 text-center">
                  Status
                </th>
                <th 
                  className="px-6 py-4 border-b border-gray-200 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('difference')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Amount (Refund / Balance)
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-gray-200 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((row) => (
                <tr key={row.memberId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {row.memberName}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">
                    {formatCurrency(row.fairShare)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(row.totalPaid)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      row.status === 'Refund' ? 'bg-green-100 text-green-800' :
                      row.status === 'Remaining Balance' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.status === 'Refund' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {row.status === 'Remaining Balance' && <AlertCircle className="w-3.5 h-3.5" />}
                      {row.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${
                    row.status === 'Refund' ? 'text-green-600' :
                    row.status === 'Remaining Balance' ? 'text-red-600' :
                    'text-gray-400'
                  }`}>
                    {row.status === 'Settled' ? '-' : formatCurrency(Math.abs(row.difference))}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {row.status === 'Refund' && (
                      <button
                        onClick={() => setConfirmModal({ memberId: row.memberId, amount: Math.abs(row.difference), type: 'Refund' })}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Mark Refunded
                      </button>
                    )}
                    {row.status === 'Remaining Balance' && (
                      <button
                        onClick={() => setConfirmModal({ memberId: row.memberId, amount: Math.abs(row.difference), type: 'Payment' })}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                    {row.status === 'Settled' && (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-gray-300" />
                      <p>No members found matching "{searchTerm}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Settlement</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to record a {confirmModal.type} of {formatCurrency(confirmModal.amount)}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSettle}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
