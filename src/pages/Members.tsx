import React, { useEffect, useState } from "react";
import { Member } from "../types";
import { useAuth } from "../context/AuthContext";
import { Plus, Edit, Trash, Search } from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    student_id: "",
    contact_info: "",
  });
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const res = await fetch("/api/members");
    const data = await res.json();
    setMembers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingMember
      ? `/api/members/${editingMember.id}`
      : "/api/members";
    const method = editingMember ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        admin_id: user?.id,
        admin_name: user?.name,
      }),
    });

    setIsModalOpen(false);
    setEditingMember(null);
    setFormData({ name: "", student_id: "", contact_info: "" });
    fetchMembers();
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      student_id: member.student_id,
      contact_info: member.contact_info,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (member: Member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;

    await fetch(`/api/members/${memberToDelete.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-id": user?.id.toString() || "",
        "x-admin-name": user?.name || "",
      },
    });
    fetchMembers();
    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        {user?.role !== "Guest" && (
          <button
            onClick={() => {
              setEditingMember(null);
              setFormData({ name: "", student_id: "", contact_info: "" });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search members..."
          className="w-full outline-none text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {member.student_id}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {member.contact_info}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {user?.role !== "Guest" && (
                      <>
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(member)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingMember ? "Edit Member" : "Add New Member"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Student ID
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.student_id}
                  onChange={(e) =>
                    setFormData({ ...formData, student_id: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Info
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.contact_info}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_info: e.target.value })
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
                  Save
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
        title="Delete Member"
        message={`Are you sure you want to delete ${memberToDelete?.name}? This action cannot be undone.`}
        deletedBy={user?.name || "Unknown Admin"}
      />
    </div>
  );
}
