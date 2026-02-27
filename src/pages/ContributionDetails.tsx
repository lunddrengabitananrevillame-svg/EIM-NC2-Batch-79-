import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Contribution, Member, Payment } from "../types";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate } from "../lib/utils";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function ContributionDetails() {
  const { id } = useParams();
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
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

  const totalCollected = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const expectedTotal = members.length * contribution.amount_per_person;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {contribution.title}
        </h1>
        <p className="text-gray-500 mb-4">{contribution.purpose}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Amount per Person:</span>
            <span className="font-semibold ml-2">
              {formatCurrency(contribution.amount_per_person)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Due Date:</span>
            <span className="font-semibold ml-2">
              {formatDate(contribution.due_date)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Total Collected:</span>
            <span className="font-semibold ml-2 text-green-600">
              {formatCurrency(totalCollected)}
            </span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-gray-500">
              {formatCurrency(expectedTotal)}
            </span>
          </div>
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
              {memberStatus.map((ms) => (
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
                              {new Date(p.date_paid).toLocaleDateString()}
                            </span>
                            <span className="hidden sm:inline text-gray-300">•</span>
                            <span className="italic text-gray-400">
                              by {p.admin_name || "Unknown"}
                            </span>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
