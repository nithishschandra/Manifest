import { useEffect, useState } from 'react'
import api, { getErrorMessage } from '../../api/client'
import Spinner from '../../components/Spinner'
import { ErrorAlert, StatusBadge } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { formatDate, money } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'

const STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled']

export default function AdminOrdersPage() {
  useDocumentTitle('Admin · Orders')
  const { notify } = useToast()
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/orders', { params: filter ? { status_filter: filter } : {} })
      setOrders(data)
      setError('')
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load orders.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function changeStatus(order, status) {
    setBusyId(order.id)
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/status`, { status })
      setOrders((list) => list.map((o) => (o.id === data.id ? data : o)))
      notify(`Order #${order.id} marked as ${status.toLowerCase()}`)
    } catch (e) {
      notify(getErrorMessage(e, 'Could not update the order.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <h2 className="font-black">Orders</h2>
        <select className="field !w-auto !py-2" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <ErrorAlert message={error} onRetry={load} />
      {loading ? <Spinner /> : orders.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">No orders match this filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Ship to</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <b>#{o.id}</b>
                    <div className="text-xs text-slate-400">{formatDate(o.created_at)}</div>
                  </td>
                  <td>
                    <div className="font-semibold">{o.customer_name}</div>
                    <div className="text-xs text-slate-400">{o.customer_email}</div>
                  </td>
                  <td className="max-w-[220px] text-xs text-slate-500">
                    {o.shipping_name}, {o.shipping_address}, {o.shipping_city} {o.shipping_postal_code}, {o.shipping_phone}
                  </td>
                  <td className="text-xs text-slate-500">
                    {o.items.map((i) => `${i.product_name} × ${i.quantity}`).join(', ')}
                  </td>
                  <td className="font-semibold">{money(o.total)}</td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <StatusBadge status={o.status} />
                      <select
                        className="field !py-1.5 !text-xs"
                        value={o.status}
                        disabled={busyId === o.id || o.status === 'Cancelled'}
                        onChange={(e) => changeStatus(o, e.target.value)}
                        aria-label={`Status for order ${o.id}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} disabled={s === 'Cancelled' && o.status !== 'Processing' && o.status !== 'Cancelled'}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
