import { useEffect, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import Spinner from '../../components/Spinner'
import { ErrorAlert, Field } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { money, PLACEHOLDER_IMAGE } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'

const EMPTY_FORM = { name: '', description: '', category: 'General', price: '', stock: '10', image_url: '' }

export default function AdminProductsPage() {
  useDocumentTitle('Admin · Products')
  const { notify } = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function load() {
    try {
      const { data } = await api.get('/products')
      setProducts(data)
      setError('')
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load products.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function startEdit(p) {
    setEditingId(p.id)
    setFormError('')
    setForm({
      name: p.name,
      description: p.description || '',
      category: p.category,
      price: String(p.price),
      stock: String(p.stock),
      image_url: p.image_url || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function save(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
    }
    try {
      if (editingId) await api.put(`/admin/products/${editingId}`, payload)
      else await api.post('/admin/products', payload)
      notify(editingId ? 'Product updated' : 'Product added')
      resetForm()
      load()
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save the product.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/products/${p.id}`)
      notify('Product deleted')
      if (editingId === p.id) resetForm()
      load()
    } catch (err) {
      notify(getErrorMessage(err, 'Could not delete the product.'), 'error')
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <form onSubmit={save} className="panel h-fit space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black">{editingId ? 'Edit product' : 'Add product'}</h2>
          {editingId && (
            <button type="button" className="ghost-btn !p-1" onClick={resetForm} aria-label="Cancel editing">
              <X size={18} />
            </button>
          )}
        </div>
        <ErrorAlert message={formError} />
        <Field label="Name">
          <input className="field" required minLength={2} maxLength={180} value={form.name} onChange={update('name')} />
        </Field>
        <Field label="Description">
          <textarea className="field min-h-24" maxLength={5000} value={form.description} onChange={update('description')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <input className="field" required maxLength={80} value={form.category} onChange={update('category')} />
          </Field>
          <Field label="Price (₹)">
            <input className="field" type="number" min="0.01" step="0.01" required value={form.price} onChange={update('price')} />
          </Field>
        </div>
        <Field label="Stock">
          <input className="field" type="number" min="0" step="1" required value={form.stock} onChange={update('stock')} />
        </Field>
        <Field label="Image URL (optional)">
          <input className="field" type="url" maxLength={1000} placeholder="https://…" value={form.image_url} onChange={update('image_url')} />
        </Field>
        {form.image_url && (
          <img
            src={form.image_url}
            alt="Preview"
            className="h-32 w-full rounded-xl object-cover"
            onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE }}
          />
        )}
        <button className="primary w-full justify-center" disabled={saving}>
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
        </button>
      </form>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-black">Catalogue</h2>
          <span className="text-sm text-slate-500">{products.length} products</span>
        </div>
        <ErrorAlert message={error} onRetry={() => { setLoading(true); load() }} />
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={editingId === p.id ? 'bg-indigo-50/60' : ''}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img src={p.image_url || PLACEHOLDER_IMAGE} alt="" className="h-11 w-11 rounded-lg object-cover" onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE }} />
                        <span className="font-semibold">{p.name}</span>
                      </div>
                    </td>
                    <td className="text-slate-500">{p.category}</td>
                    <td>{money(p.price)}</td>
                    <td className={p.stock === 0 ? 'font-semibold text-rose-600' : ''}>{p.stock}</td>
                    <td className="text-right">
                      <button className="ghost-btn !px-2" onClick={() => startEdit(p)} aria-label={`Edit ${p.name}`}><Pencil size={15} /></button>
                      <button className="ghost-btn !px-2 text-rose-600" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
