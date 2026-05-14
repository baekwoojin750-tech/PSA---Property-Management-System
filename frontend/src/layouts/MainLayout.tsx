import { Outlet } from 'react-router-dom'
import Navbar from '../components/shared/Navbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      <Navbar />
      <main className="min-w-0 px-3 sm:px-4 pb-8">
        <Outlet />
      </main>
    </div>
  )
}
