import { useEffect, useState } from "react";
import { BankAccount } from "@/types/bank-account";
import {
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "@/lib/api-service";

interface FormData {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: "ออมทรัพย์" | "กระแสรายวัน";
  isActive: boolean;
}

const emptyForm: FormData = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  accountType: "ออมทรัพย์",
  isActive: true,
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await getBankAccounts();
      setAccounts(data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลบัญชีธนาคารได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setForm({
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      isActive: account.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.bankName || !form.accountName || !form.accountNumber) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateBankAccount(editingId, form);
      } else {
        await createBankAccount(form);
      }
      setShowModal(false);
      fetchAccounts();
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBankAccount(id);
      setDeleteConfirm(null);
      fetchAccounts();
    } catch {
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">บัญชีธนาคาร</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          + เพิ่มบัญชี
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md p-6 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          ยังไม่มีบัญชีธนาคาร
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                account.isActive ? "border-green-500" : "border-gray-300"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {account.bankName}
                  </h3>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      account.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {account.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(account)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(account.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ลบ
                  </button>
                </div>
              </div>

              <p className="text-gray-700 text-sm mb-1">
                <span className="text-gray-500">ชื่อบัญชี:</span>{" "}
                {account.accountName}
              </p>

              <div className="flex items-center gap-2 mb-1">
                <p className="text-gray-700 text-sm">
                  <span className="text-gray-500">เลขบัญชี:</span>{" "}
                  <span className="font-mono font-medium">
                    {account.accountNumber}
                  </span>
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(account.accountNumber, account.id)
                  }
                  className="text-gray-400 hover:text-blue-600 text-xs"
                  title="คัดลอกเลขบัญชี"
                >
                  {copiedId === account.id ? (
                    <span className="text-green-600">คัดลอกแล้ว!</span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 inline"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <p className="text-gray-700 text-sm">
                <span className="text-gray-500">ประเภท:</span>{" "}
                {account.accountType}
              </p>

              {/* Delete confirmation */}
              {deleteConfirm === account.id && (
                <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="text-sm text-red-700 mb-2">
                    ยืนยันการลบบัญชีนี้?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      ยืนยันลบ
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingId ? "แก้ไขบัญชีธนาคาร" : "เพิ่มบัญชีธนาคาร"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อธนาคาร
                </label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) =>
                    setForm({ ...form, bankName: e.target.value })
                  }
                  placeholder="เช่น ไทยพาณิชย์, กสิกรไทย"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อบัญชี
                </label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={(e) =>
                    setForm({ ...form, accountName: e.target.value })
                  }
                  placeholder="ชื่อเจ้าของบัญชี"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เลขบัญชี
                </label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm({ ...form, accountNumber: e.target.value })
                  }
                  placeholder="xxx-xxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทบัญชี
                </label>
                <select
                  value={form.accountType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      accountType: e.target.value as FormData["accountType"],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="ออมทรัพย์">ออมทรัพย์</option>
                  <option value="กระแสรายวัน">กระแสรายวัน</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  เปิดใช้งาน
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.bankName ||
                  !form.accountName ||
                  !form.accountNumber
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
