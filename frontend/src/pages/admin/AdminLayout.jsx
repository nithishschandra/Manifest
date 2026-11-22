import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '../../components/ui'

const tabs = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/users', label: 'Customers' },
]

export default function AdminLayout() {
  return (
    <>
      <PageHeader title="Admin" subtitle="Store overview, inventory, orders and customers." />
      <nav className="mb-6 flex flex-wrap gap-1 border-b pb-3" aria-label="Admin sections">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
