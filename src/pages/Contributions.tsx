import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Contribution } from "../types";
import { useAuth } from "../context/AuthContext";
import { Plus, Calendar, DollarSign, Trash } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";
import ConfirmationModal from "../components/ConfirmationModal";

export default function Contributions() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    purpose: "",
    amount_per_person: "",
    due_date: "",
  });
  const { user } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contributionToDelete, setContributionToDelete] = useState<Contribution | null>(null);

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    const res = await fetch("/api/contributions");
    const data = await res.json();
    setContributions(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/contributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        amount_per_person: parseFloat(formData.amount_per_person),
        admin_id: user?.id,
        admin_name: user?.name,
      }),
    });
    setIsModalOpen(false);
    setFormData({ title: "", purpose: "", amount_per_person: "", due_date: "" });
    fetchContributions();
  };

  const handleDeleteClick = (e: React.MouseEvent, contribution: Contribution) => {
    e.preventDefault(); // Prevent navigation to details
    setContributionToDelete(contribution);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!contributionToDelete) return;
    await fetch(`/api/contributions/${contributionToDelete.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-id": user?.id.toString() || "",
        "x-admin-name": user?.name || "",
      },
    });
    fetchContributions();
    setIsDeleteModalOpen(false);
    setContributionToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Contributions</h1>
        {user?.role !== "Guest" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Contribution
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contributions.map((contribution) => (
          <Link
            to={`/contributions/${contribution.id}`}
            key={contribution.id}
            className="block bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition group relative"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition pr-8">
                {contribution.title}
              </h3>
              <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                 <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  {formatCurrency(contribution.amount_per_person)}
                </span>
                {user?.role !== "Guest" && (
                  <button
                    onClick={(e) => handleDeleteClick(e, contribution)}
                    className="text-gray-400 hover:text-red-600 transition p-1 z-10"
                    title="Delete Contribution"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2 mt-6">
              {contribution.purpose}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due: {formatDate(contribution.due_date)}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">New Contribution</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tools Fund"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Purpose
                </label>
                <textarea
                  required
                  placeholder="What is this for?"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount per Person
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
                    value={formData.amount_per_person}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount_per_person: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                />
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Contribution"
        message={`Are you sure you want to delete "${contributionToDelete?.title}"? This will also delete all associated payment records. This action cannot be undone.`}
        deletedBy={user?.name || "Unknown Admin"}
      />
    </div>
  );
}
