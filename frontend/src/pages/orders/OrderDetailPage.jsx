import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import Spinner from '../../components/Spinner'
import { ErrorAlert, PageHeader, StatusBadge } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { formatDate, money } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'

export default function OrderDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const justPlaced = Boolean(location.state?.justPlaced)

  useDocumentTitle(order ? `Order #${order.id}` : 'Order')

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then((r) => setOrder(r.data))
      .catch((e) => setError(getErrorMessage(e, 'Order not found.')))
      .finally(() => setLoading(false))
  }, [id])

  async function cancel() {
    if (!window.confirm('Cancel this order? The items will be returned to stock.')) return
    setCancelling(true)
    try {
      const { data } = await api.post(`/orders/${id}/cancel`)
      setOrder(data)
      notify('Order cancelled')
    } catch (e) {
      notify(getErrorMessage(e, 'Could not cancel this order.'), 'error')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <Spinner />
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorAlert message={error} />
        <button className="secondary" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> All orders</button>
      </div>
    )
  }

  const subtotal = order.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  return (
    <>
      <Link to="/orders" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft size={16} /> All orders
      </Link>

      {justPlaced && (
        <div className="alert alert-success mb-6 flex items-center gap-2">
          <CheckCircle2 size={18} /> Thank you! Your order has been placed.
        </div>
      )}

      <PageHeader
        title={`Order #${order.id}`}
        subtitle={`Placed ${formatDate(order.created_at)}`}
        actions={order.status === 'Processing' && (
          <button className="danger-btn" onClick={cancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
        )}
      />

      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-slate-500">Status:</span> <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="panel p-0">
          <div className="border-b p-5 font-black">Items</div>
          <table className="table">
            <thead><tr><th>Product</th><th>Qty</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link to={`/products/${i.product_id}`} className="font-semibold hover:text-brand">{i.product_name}</Link>
                    <div className="text-xs text-slate-400">{money(i.unit_price)} each</div>
                  </td>
                  <td>{i.quantity}</td>
                  <td className="text-right font-semibold">{money(i.unit_price * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between border-t p-5 font-black">
            <span>Total</span><span>{money(order.total || subtotal)}</span>
          </div>
        </section>

        <aside className="panel h-fit">
          <h2 className="font-black">Delivery address</h2>
          <address className="mt-3 not-italic text-sm leading-6 text-slate-600">
            <b className="text-ink">{order.shipping_name}</b><br />
            {order.shipping_address}<br />
            {order.shipping_city} {order.shipping_postal_code}<br />
            {order.shipping_country}<br />
            {order.shipping_phone}
          </address>
        </aside>
      </div>
    </>
  )
}
