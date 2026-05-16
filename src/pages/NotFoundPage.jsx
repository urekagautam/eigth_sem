import { Link } from "react-router-dom"
import Button from "../components/Button"

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page Not Found</p>
      <Link to="/admin/dashboard">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  )
}
