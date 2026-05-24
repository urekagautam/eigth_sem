import { useState } from "react"
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react"
import Button from "../../components/Button"

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"

export default function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Please fill in all fields.")
      return
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.")
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.")
      return
    }
    if (form.currentPassword === form.newPassword) {
      setError("New password must be different from your current password.")
      return
    }

    // UI only — hook up to API later
    setSuccess(true)
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  const PasswordField = ({ label, name, showKey }) => (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show[showKey] ? "text" : "password"}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={`Enter ${label.toLowerCase()}`}
          className={`${inputClass} pr-12`}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
        />
        <button
          type="button"
          onClick={() => setShow({ ...show, [showKey]: !show[showKey] })}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          aria-label={show[showKey] ? "Hide password" : "Show password"}
        >
          {show[showKey] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Change Password</h1>
        <p className="mt-1 text-gray-600">Update your admin account password</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Lock className="h-5 w-5 shrink-0" />
          <p>Use at least 8 characters with a mix of letters and numbers.</p>
        </div>

        <PasswordField label="Current Password" name="currentPassword" showKey="current" />
        <PasswordField label="New Password" name="newPassword" showKey="new" />
        <PasswordField label="Confirm New Password" name="confirmPassword" showKey="confirm" />

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Password updated successfully. (UI demo — connect API later.)
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
              setError("")
              setSuccess(false)
            }}
          >
            Clear
          </Button>
          <Button type="submit" variant="primary">
            Update Password
          </Button>
        </div>
      </form>
    </div>
  )
}
