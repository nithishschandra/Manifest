import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Package } from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import Spinner from '../../components/Spinner'
import { EmptyState, ErrorAlert, PageHeader, StatusBadge } from '../../components/ui'
import { formatDate, money } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'

export default function OrdersPage() {
  useDocumentTitle('My ongoing orders')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/orders')
      .then((r) => setOrders(r.data))
      .catch((e) => setError(getErrorMessage(e, 'Could not load your orders.')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader title="My ongoing orders" subtitle="Track purchases that are processing or shipped." />
      <ErrorAlert message={error} />
      {loading ? <Spinner /> : orders.length === 0 && !error ? (
        <EmptyState icon={Package} title="No ongoing orders" message="Orders that are processing or shipped will appear here." actionLabel="Start shopping" actionTo="/" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card flex items-center gap-4 p-5 transition hover:border-brand">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <b>Order #{o.id}</b>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(o.created_at)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                </p>
              </div>
              <b className="text-lg">{money(o.total)}</b>
              <ChevronRight className="text-slate-300" size={18} />
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
