import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { ErrorAlert, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { money } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'
import DeliveryAddressPicker from '../../components/DeliveryAddressPicker'

const EMPTY_SHIPPING = {
  full_name: '', phone: '', address_line: '', city: '', postal_code: '', country: 'India',
  latitude: null, longitude: null,
}

export default function CheckoutPage() {
  useDocumentTitle('Checkout')
  const { user } = useAuth()
  const { items, subtotal, clearCart } = useCart()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [shipping, setShipping] = useState({ ...EMPTY_SHIPPING, full_name: user?.name || '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!items.length) {
    return (
      <>
        <PageHeader title="Checkout" />
        <div className="panel text-center">
          <p className="text-slate-500">Your cart is empty.</p>
          <Link to="/" className="primary mt-4">Continue shopping</Link>
        </div>
      </>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!shipping.city || !shipping.city.toLowerCase().includes('chennai')) {
      setError('Only Chennai delivery addresses are supported.')
      return
    }
    if (
      shipping.latitude != null
      && shipping.longitude != null
      && (shipping.latitude < 12.75 || shipping.latitude > 13.25
        || shipping.longitude < 80.05 || shipping.longitude > 80.35)
    ) {
      setError('The selected delivery location must be within Chennai.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        shipping,
      }
      const { data } = await api.post('/orders', payload)
      clearCart()
      notify(`Order #${data.id} placed successfully`)
      navigate(`/orders/${data.id}`, { state: { justPlaced: true } })
    } catch (err) {
      setError(getErrorMessage(err, 'We could not place your order. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title="Checkout" subtitle="Where should we deliver your order?" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit} className="panel space-y-4">
          <ErrorAlert message={error} />
          <DeliveryAddressPicker shipping={shipping} setShipping={setShipping} />

          <div className="alert alert-info flex items-start gap-2">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <span>This is a demo checkout. No payment is taken, but the order is saved and stock is reserved.</span>
          </div>

          <button type="submit" className="primary w-full justify-center" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place order · ${money(subtotal)}`}
          </button>
        </form>

        <aside className="panel h-fit">
          <h2 className="font-black">Items</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => (
              <li key={i.product_id} className="flex justify-between gap-3">
                <span className="text-slate-600">{i.name} × {i.quantity}</span>
                <span className="font-semibold">{money(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t pt-4 font-black">
            <span>Total</span><span>{money(subtotal)}</span>
          </div>
          <Link to="/cart" className="mt-4 block text-center text-sm font-semibold text-brand">Edit cart</Link>
        </aside>
      </div>
    </>
  )
}
