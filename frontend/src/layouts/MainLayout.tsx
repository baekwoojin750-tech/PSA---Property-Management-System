import { Outlet } from 'react-router-dom'
import Navbar from '../components/shared/Navbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="px-4 pb-8">
        <Outlet />
      </main>
    </div>
  )
}