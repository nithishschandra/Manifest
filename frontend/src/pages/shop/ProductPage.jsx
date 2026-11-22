import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import Spinner from '../../components/Spinner'
import { ErrorAlert } from '../../components/ui'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { money, PLACEHOLDER_IMAGE } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'

export default function ProductPage() {
  const { id } = useParams()
  const { addItem, items } = useCart()
  const { notify } = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)

  useDocumentTitle(product?.name)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .get(`/products/${id}`)
      .then((r) => { if (!cancelled) setProduct(r.data) })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e, 'Product not found.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) return <Spinner />
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorAlert message={error} />
        <Link to="/" className="secondary"><ArrowLeft size={16} /> Back to shop</Link>
      </div>
    )
  }

  const inCart = items.find((i) => i.product_id === product.id)?.quantity || 0
  const maxSelectable = Math.max(0, Math.min(99, product.stock - inCart))

  function handleAdd() {
    if (addItem(product, quantity)) {
      notify(`${quantity} × ${product.name} added to cart`)
      setQuantity(1)
    }
  }

  return (
    <div>
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft size={16} /> Back to shop
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <img
            src={product.image_url || PLACEHOLDER_IMAGE}
            alt={product.name}
            className="aspect-[4/3] w-full object-cover"
            onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE }}
          />
        </div>

        <div className="flex flex-col">
          <span className="badge badge-slate w-fit">{product.category}</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{product.name}</h1>
          <p className="mt-4 whitespace-pre-line text-slate-600">{product.description || 'No description yet.'}</p>

          <div className="mt-6 text-3xl font-black">{money(product.price)}</div>
          <p className={`mt-1 text-sm ${product.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            {inCart > 0 && <span className="text-slate-500"> · {inCart} already in your cart</span>}
          </p>

          {product.stock > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2" role="group" aria-label="Quantity">
                <button className="qty" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold" aria-live="polite">{quantity}</span>
                <button className="qty" onClick={() => setQuantity((q) => Math.min(maxSelectable, q + 1))} disabled={quantity >= maxSelectable} aria-label="Increase quantity">
                  <Plus size={14} />
                </button>
              </div>
              <button className="primary" onClick={handleAdd} disabled={maxSelectable === 0}>
                <ShoppingCart size={16} /> {maxSelectable === 0 ? 'Maximum in cart' : 'Add to cart'}
              </button>
            </div>
          )}

          <Link to="/cart" className="mt-4 text-sm font-semibold text-brand">View cart →</Link>
        </div>
      </div>
    </div>
  )
}
