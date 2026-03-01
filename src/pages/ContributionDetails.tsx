import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Contribution, Member, Payment } from "../types";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate } from "../lib/utils";
import { CheckCircle, XCircle, AlertCircle, X, Search, Filter } from "lucide-react";

export default function ContributionDetails() {
  const { id } = useParams();
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  
  // Smart Features State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Unpaid">("All");
  const [activeTab, setActiveTab] = useState<"members" | "payments">("members");

  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [contRes, memRes, payRes] = await Promise.all([
        fetch("/api/contributions"),
        fetch("/api/members"),
        fetch(`/api/payments/contribution/${id}`),
      ]);

      const contributions = await contRes.json();
      const found = contributions.find((c: Contribution) => c.id === Number(id));
      setContribution(found || null);

      setMembers(await memRes.json());
      setPayments(await payRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !contribution) return;

    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contribution_id: contribution.id,
        member_id: selectedMember.id,
        amount_paid: parseFloat(paymentAmount),
        admin_id: user?.id,
        admin_name: user?.name,
      }),
    });

    setIsModalOpen(false);
    setSelectedMember(null);
    setPaymentAmount("");
    fetchData();
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;

    await fetch(`/api/payments/${deletePaymentId}`, {
      method: "DELETE",
      headers: {
        "x-admin-id": user?.id?.toString() || "",
        "x-admin-name": user?.name || "",
      },
    });

    setDeletePaymentId(null);
    fetchData();
  };

  if (!contribution) return <div>Loading...</div>;

  const memberStatus = members.map((member) => {
    const memberPayments = payments.filter((p) => p.member_id === member.id);
    const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount_paid, 0);
    const balance = contribution.amount_per_person - totalPaid;
    let status: "Paid" | "Partial" | "Unpaid" = "Unpaid";
    if (totalPaid >= contribution.amount_per_person) status = "Paid";
    else if (totalPaid > 0) status = "Partial";

    return { ...member, totalPaid, balance, status, memberPayments };
  });

  // Smart Filtering
  const filteredMembers = memberStatus.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      statusFilter === "All" ? true :
      statusFilter === "Paid" ? m.status === "Paid" :
      m.status !== "Paid"; // Unpaid includes Partial and Unpaid
    return matchesSearch && matchesFilter;
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const expectedTotal = members.length * contribution.amount_per_person;
  const outstandingBalance = expectedTotal - totalCollected;
  
  const paidCount = memberStatus.filter(m => m.status === "Paid").length;
  const progress = members.length > 0 ? (paidCount / members.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {contribution.title}
            </h1>
            <p className="text-gray-500">{contribution.purpose}</p>
          </div>
          <div className="mt-4 md:mt-0 text-right">
             <div className="text-sm text-gray-500 mb-1">Collection Progress</div>
             <div className="flex items-center gap-2">
                <div className="w-32 md:w-48 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
             </div>
             <div className="text-xs text-gray-400 mt-1">{paidCount} of {members.length} members paid</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border-t pt-4">
          <div>
            <span className="text-gray-500">Amount per Person:</span>
            <span className="font-semibold ml-2">
              {formatCurrency(contribution.amount_per_person)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Total Collected:</span>
            <span className="font-semibold ml-2 text-green-600">
              {formatCurrency(totalCollected)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Outstanding:</span>
            <span className="font-semibold ml-2 text-red-500">
              {formatCurrency(outstandingBalance)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2.5 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "members"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
          onClick={() => setActiveTab("members")}
        >
          Member Status
        </button>
        <button
          className={`py-2.5 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "payments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
          onClick={() => setActiveTab("payments")}
        >
          Payment Breakdown
        </button>
      </div>

      {activeTab === "members" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search member..." 
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {(["All", "Paid", "Unpaid"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    statusFilter === status 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {status === "Unpaid" ? "Unpaid / Partial" : status}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Paid</th>
                    <th className="px-6 py-4">Balance</th>
                    <th className="px-6 py-4">Payment History</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((ms) => (
                      <tr key={ms.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {ms.name}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              ms.status === "Paid"
                                ? "bg-green-100 text-green-800"
                                : ms.status === "Partial"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {ms.status === "Paid" && <CheckCircle className="w-3 h-3" />}
                            {ms.status === "Partial" && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {ms.status === "Unpaid" && <XCircle className="w-3 h-3" />}
                            {ms.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {formatCurrency(ms.totalPaid)}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {formatCurrency(ms.balance)}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {ms.memberPayments.length > 0 ? (
                            <div className="space-y-1">
                              {ms.memberPayments.map((p) => (
                                <div key={p.id} className="text-xs flex flex-col sm:flex-row sm:items-center gap-1">
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(p.amount_paid)}
                                  </span>
                                  <span className="hidden sm:inline text-gray-300">•</span>
                                  <span className="text-gray-500">
                                    {formatDate(p.date_paid)}
                                  </span>
                                  <span className="hidden sm:inline text-gray-300">•</span>
                                  <span className="italic text-gray-400">
                                    by {p.admin_name || "Unknown"}
                                  </span>
                                  {user?.role !== "Guest" && (
                                    <button
                                      onClick={() => setDeletePaymentId(p.id)}
                                      className="text-gray-400 hover:text-red-600 transition p-0.5 ml-1"
                                      title="Revert Payment"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {ms.status !== "Paid" && user?.role !== "Guest" && (
                            <button
                              onClick={() => {
                                setSelectedMember(ms);
                                setPaymentAmount(ms.balance.toString()); // Default to full balance
                                setIsModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                            >
                              Record Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No members found matching your search or filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Member Name</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4">Received By</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(payment.date_paid)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {payment.member_name}
                      </td>
                      <td className="px-6 py-4 font-semibold text-green-600">
                        {formatCurrency(payment.amount_paid)}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {payment.admin_name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user?.role !== "Guest" && (
                          <button
                            onClick={() => setDeletePaymentId(payment.id)}
                            className="text-red-500 hover:text-red-700 font-medium text-xs transition"
                          >
                            Revert
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No payments have been recorded for this contribution yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Recording payment for <strong>{selectedMember.name}</strong>
            </p>
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    required
                    className="block w-full rounded-md border-gray-300 pl-7 p-2"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={contribution.amount_per_person} // Optional constraint
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletePaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-red-600 mb-2">Revert Payment</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this payment record? This will increase the member's balance.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletePaymentId(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayment}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Revert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
