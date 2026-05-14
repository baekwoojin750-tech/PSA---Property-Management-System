import { Outlet } from 'react-router-dom'
import Navbar from '../components/shared/Navbar'

export default function MainLayout() {
  return (
    <div className="app-shell-bg min-h-screen overflow-x-hidden">
      <Navbar />
      <main className="min-w-0 px-3 sm:px-4 pb-8">
        <Outlet />
      </main>
    </div>
  )
}
