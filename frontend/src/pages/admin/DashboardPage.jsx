import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IndianRupee, Package, ShoppingBag, Users } from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import Spinner from '../../components/Spinner'
import { ErrorAlert, StatusBadge } from '../../components/ui'
import { formatDate, money } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'

export default function DashboardPage() {
  useDocumentTitle('Admin dashboard')
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/admin/stats'), api.get('/admin/orders')])
      .then(([s, o]) => {
        setStats(s.data)
        setRecent(o.data.slice(0, 5))
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load the dashboard.')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const cards = stats && [
    { label: 'Revenue', value: money(stats.revenue), icon: IndianRupee, hint: 'Excludes cancelled orders' },
    { label: 'Orders', value: stats.orders, icon: Package, hint: `${stats.pending_orders} awaiting processing` },
    { label: 'Customers', value: stats.users, icon: Users, hint: 'Registered accounts' },
    { label: 'Products', value: stats.products, icon: ShoppingBag, hint: 'In the catalogue' },
  ]

  return (
    <div className="space-y-6">
      <ErrorAlert message={error} />
      {cards && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, hint }) => (
            <div className="stat" key={label}>
              <Icon className="text-brand" />
              <p className="mt-3 text-sm text-slate-500">{label}</p>
              <b className="text-2xl">{value}</b>
              <p className="mt-1 text-xs text-slate-400">{hint}</p>
            </div>
          ))}
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-black">Recent orders</h2>
          <Link to="/admin/orders" className="text-sm font-semibold text-brand">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className="font-semibold">#{o.id}</td>
                  <td>{o.customer_name}</td>
                  <td className="text-slate-500">{formatDate(o.created_at)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-right font-semibold">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
