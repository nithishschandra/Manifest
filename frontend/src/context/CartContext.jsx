import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'shoply_cart'
const MAX_QTY = 99
const CartContext = createContext(null)

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * The cart lives in localStorage so it survives page refreshes.
 * The server re-checks prices and stock when the order is placed.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const value = useMemo(() => {
    const addItem = (product, quantity = 1) => {
      if (!product.stock) return false
      const limit = Math.min(MAX_QTY, product.stock)
      setItems((prev) => {
        const snapshot = {
          product_id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          stock: product.stock,
        }
        const existing = prev.find((i) => i.product_id === product.id)
        if (existing) {
          const nextQty = Math.min(existing.quantity + quantity, limit)
          return prev.map((i) => (i.product_id === product.id ? { ...i, ...snapshot, quantity: nextQty } : i))
        }
        return [...prev, { ...snapshot, quantity: Math.min(quantity, limit) }]
      })
      return true
    }

    const setQuantity = (productId, quantity) => {
      setItems((prev) =>
        prev
          .map((i) => {
            if (i.product_id !== productId) return i
            const capped = Math.min(quantity, MAX_QTY, i.stock || MAX_QTY)
            return { ...i, quantity: capped }
          })
          .filter((i) => i.quantity > 0)
      )
    }

    const removeItem = (productId) => setItems((prev) => prev.filter((i) => i.product_id !== productId))
    const clearCart = () => setItems([])

    const count = items.reduce((sum, i) => sum + i.quantity, 0)
    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0)

    return { items, count, subtotal, addItem, setQuantity, removeItem, clearCart }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
