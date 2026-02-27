import React, { useEffect, useState } from "react";
import { Expense } from "../types";
import { useAuth } from "../context/AuthContext";
import { Plus, Search, Trash } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    item_name: "",
    category: "Tool",
    specification: "",
    quantity: "1",
    price_per_unit: "",
  });
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const fetchExpenses = async () => {
    const res = await fetch("/api/expenses");
    const data = await res.json();
    setExpenses(data);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(formData.quantity);
    const price = parseFloat(formData.price_per_unit);
    const total = qty * price;

    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        quantity: qty,
        price_per_unit: price,
        total_cost: total,
        admin_id: user?.id,
        admin_name: user?.name,
      }),
    });

    setIsModalOpen(false);
    setFormData({
      item_name: "",
      category: "Tool",
      specification: "",
      quantity: "1",
      price_per_unit: "",
    });
    fetchExpenses();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    await fetch(`/api/expenses/${deleteId}`, {
      method: "DELETE",
      headers: {
        "x-admin-id": user?.id?.toString() || "",
        "x-admin-name": user?.name || "",
      },
    });

    setDeleteId(null);
    fetchExpenses();
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        {user?.role !== "Guest" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Log Expense
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search expenses..."
          className="w-full outline-none text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Spec</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Purchased By</th>
                <th className="px-6 py-4">Date</th>
                {user?.role !== "Guest" && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {expense.item_name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{expense.category}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {expense.specification}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{expense.quantity}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {formatCurrency(expense.price_per_unit)}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {formatCurrency(expense.total_cost)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {expense.admin_name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {formatDate(expense.date_purchased)}
                  </td>
                  {user?.role !== "Guest" && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteId(expense.id)}
                        className="text-gray-400 hover:text-red-600 transition p-1"
                        title="Delete Expense"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Log Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.item_name}
                  onChange={(e) =>
                    setFormData({ ...formData, item_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  <option value="Tool">Tool</option>
                  <option value="Wire">Wire</option>
                  <option value="Component">Component</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Specification
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2.0mm²"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.specification}
                  onChange={(e) =>
                    setFormData({ ...formData, specification: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price/Unit
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.price_per_unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_per_unit: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Purchased By
                </label>
                <input
                  type="text"
                  disabled
                  className="mt-1 block w-full border border-gray-300 bg-gray-50 rounded-md shadow-sm p-2 text-gray-500"
                  value={user?.name || "Unknown"}
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
                  Log Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-red-600 mb-2">Delete Expense</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
