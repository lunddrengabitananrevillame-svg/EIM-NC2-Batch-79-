import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Save, AlertTriangle } from "lucide-react";

interface AdminUser {
  id: number;
  name: string;
  role: string;
  passcode: string | null;
}

export default function Settings() {
  const { user } = useAuth();
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Setup Mode State
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [setupPasscodes, setSetupPasscodes] = useState<{ [key: number]: string }>({});
  const [setupConfirmPasscodes, setSetupConfirmPasscodes] = useState<{ [key: number]: string }>({});
  const [setupMessage, setSetupMessage] = useState("");

  const isSetupMode = user?.role === "SuperAdmin" || user?.name === "System Setup";

  useEffect(() => {
    if (isSetupMode) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => setAdmins(data))
        .catch((err) => console.error("Error fetching admins:", err));
    }
  }, [isSetupMode]);

  const handleSetupSubmit = async (adminId: number) => {
    const pass = setupPasscodes[adminId];
    const confirm = setupConfirmPasscodes[adminId];

    if (pass !== confirm) {
      setSetupMessage(`Passcodes do not match for admin ID ${adminId}`);
      return;
    }
    if (!pass || pass.length !== 4 || isNaN(Number(pass))) {
      setSetupMessage(`Invalid passcode for admin ID ${adminId}. Must be 4 digits.`);
      return;
    }

    try {
      const res = await fetch("/api/settings/change-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adminId,
          currentPasscode: null, // Initial setup doesn't require current passcode
          newPasscode: pass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSetupMessage(`Passcode set for admin ID ${adminId}`);
        // Refresh list to update status if needed, or just update local state
        setAdmins(admins.map(a => a.id === adminId ? { ...a, passcode: "SET" } : a));
      } else {
        setSetupMessage(data.message || "Failed to set passcode.");
      }
    } catch (err) {
      setSetupMessage("Error setting passcode.");
    }
  };

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

  if (isSetupMode) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                System Setup Required. Please set initial passcodes for all officers.
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Lock className="w-6 h-6" />
          Initial Security Setup
        </h1>

        <div className="space-y-6">
          {admins.map((admin) => (
            <div key={admin.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{admin.role}</h2>
                  <p className="text-sm text-gray-500">{admin.name}</p>
                </div>
                {admin.passcode ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Passcode Set</span>
                ) : (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Not Set</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">New Passcode</label>
                  <input
                    type="password"
                    maxLength={4}
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={setupPasscodes[admin.id] || ""}
                    onChange={(e) => setSetupPasscodes({ ...setupPasscodes, [admin.id]: e.target.value })}
                    placeholder="4 digits"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm</label>
                  <input
                    type="password"
                    maxLength={4}
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={setupConfirmPasscodes[admin.id] || ""}
                    onChange={(e) => setSetupConfirmPasscodes({ ...setupConfirmPasscodes, [admin.id]: e.target.value })}
                    placeholder="Confirm"
                  />
                </div>
                <button
                  onClick={() => handleSetupSubmit(admin.id)}
                  className="flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  <Save className="w-4 h-4" />
                  Set
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {setupMessage && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
            {setupMessage}
          </div>
        )}
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
