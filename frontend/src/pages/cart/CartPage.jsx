import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { EmptyState, PageHeader } from '../../components/ui'
import { money, PLACEHOLDER_IMAGE } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'

export default function CartPage() {
  useDocumentTitle('Cart')
  const { items, subtotal, count, setQuantity, removeItem } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!items.length) {
    return (
      <>
        <PageHeader title="Your cart" />
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          message="Add something you love and it will show up here."
          actionLabel="Continue shopping"
          actionTo="/"
        />
      </>
    )
  }

  function checkout() {
    navigate(user ? '/checkout' : '/login?next=/checkout')
  }

  return (
    <>
      <PageHeader title="Your cart" subtitle={`${count} item${count === 1 ? '' : 's'}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="panel divide-y p-0">
          {items.map((item) => (
            <div key={item.product_id} className="flex items-center gap-4 p-5">
              <Link to={`/products/${item.product_id}`} className="shrink-0">
                <img
                  className="h-20 w-20 rounded-xl object-cover"
                  src={item.image_url || PLACEHOLDER_IMAGE}
                  alt={item.name}
                  onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE }}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${item.product_id}`} className="font-bold hover:text-brand">{item.name}</Link>
                <p className="text-sm text-slate-500">{money(item.price)} each</p>
                <div className="mt-2 flex items-center gap-3">
                  <button className="qty" onClick={() => setQuantity(item.product_id, item.quantity - 1)} aria-label={`Decrease ${item.name}`}>−</button>
                  <span className="w-6 text-center font-semibold">{item.quantity}</span>
                  <button
                    className="qty"
                    onClick={() => setQuantity(item.product_id, item.quantity + 1)}
                    disabled={item.quantity >= Math.min(99, item.stock)}
                    aria-label={`Increase ${item.name}`}
                  >+</button>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black">{money(item.price * item.quantity)}</div>
                <button onClick={() => removeItem(item.product_id)} className="mt-2 text-rose-500 hover:text-rose-700" aria-label={`Remove ${item.name}`}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </section>

        <aside className="panel h-fit">
          <h2 className="font-black">Order summary</h2>
          <div className="mt-4 flex justify-between text-sm text-slate-600">
            <span>Subtotal</span><span>{money(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-slate-600">
            <span>Delivery</span><span>Calculated at checkout</span>
          </div>
          <div className="mt-4 flex justify-between border-t pt-4 text-lg font-black">
            <span>Total</span><span>{money(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Prices and stock are confirmed when you place your order.</p>
          <button className="primary mt-5 w-full justify-center" onClick={checkout}>
            {user ? 'Proceed to checkout' : 'Sign in to checkout'}
          </button>
          <Link to="/" className="mt-3 block text-center text-sm font-semibold text-brand">Continue shopping</Link>
        </aside>
      </div>
    </>
  )
}
