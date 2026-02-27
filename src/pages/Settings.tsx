import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Save } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPasscode !== confirmPasscode) {
      setError("New passcodes do not match.");
      return;
    }

    if (newPasscode.length !== 4 || isNaN(Number(newPasscode))) {
      setError("Passcode must be a 4-digit number.");
      return;
    }

    try {
      const res = await fetch("/api/settings/change-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          currentPasscode,
          newPasscode,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("Passcode updated successfully.");
        setCurrentPasscode("");
        setNewPasscode("");
        setConfirmPasscode("");
      } else {
        setError(data.message || "Failed to update passcode.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  if (user?.role === "Guest") {
    return (
      <div className="text-center py-12 text-gray-500">
        Guest users cannot change settings.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Lock className="w-6 h-6" />
        Security Settings
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Change Passcode</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Passcode
            </label>
            <input
              type="password"
              required
              maxLength={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={currentPasscode}
              onChange={(e) => setCurrentPasscode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Passcode
            </label>
            <input
              type="password"
              required
              maxLength={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm New Passcode
            </label>
            <input
              type="password"
              required
              maxLength={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
            />
          </div>

          {message && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-md">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="w-4 h-4" />
            Update Passcode
          </button>
        </form>
      </div>
    </div>
  );
}
