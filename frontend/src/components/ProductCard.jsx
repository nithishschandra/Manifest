import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { money, PLACEHOLDER_IMAGE } from '../lib/format'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const { notify } = useToast()
  const outOfStock = product.stock <= 0

  function handleAdd() {
    if (addItem(product)) notify(`${product.name} added to cart`)
  }

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-image block">
        <img
          src={product.image_url || PLACEHOLDER_IMAGE}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE }}
        />
        <span>{product.category}</span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/products/${product.id}`} className="font-bold hover:text-brand">{product.name}</Link>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <div className="text-lg font-black">{money(product.price)}</div>
            <div className={`text-xs ${outOfStock ? 'text-rose-600' : 'text-slate-400'}`}>
              {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
            </div>
          </div>
          <button disabled={outOfStock} onClick={handleAdd} className="primary" aria-label={`Add ${product.name} to cart`}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>
    </article>
  )
}
