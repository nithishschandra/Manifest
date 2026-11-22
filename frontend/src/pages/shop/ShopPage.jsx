import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PackageSearch, Sparkles } from 'lucide-react'
import api from '../../api/client'
import { getErrorMessage } from '../../api/client'
import ProductCard from '../../components/ProductCard'
import Spinner from '../../components/Spinner'
import { EmptyState, ErrorAlert, PageHeader } from '../../components/ui'
import useDocumentTitle from '../../lib/useDocumentTitle'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
]

export default function ShopPage() {
  useDocumentTitle('Shop')
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'newest'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    api.get('/products/categories').then((r) => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .get('/products', { params: { q, category, sort } })
      .then((r) => { if (!cancelled) setProducts(r.data) })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e, 'Could not load products.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [q, category, sort, reloadKey])

  function update(changes) {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setSearchParams(next)
  }

  const showHero = !q && !category

  return (
    <>
      {showHero && (
        <section className="hero mb-7">
          <div className="max-w-xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[.2em] text-indigo-200">Curated for everyday</p>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">Find your next<br />everyday favourite.</h1>
            <p className="mt-4 text-indigo-100">Thoughtful picks, fair prices and a checkout that just works.</p>
            <a href="#catalog" className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-bold text-indigo-700">
              Explore collection
            </a>
          </div>
        </section>
      )}

      <div id="catalog" className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">{q ? `Results for “${q}”` : 'Shop collection'}</h2>
          <p className="text-sm text-slate-500">{loading ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'}`}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Sort by
          <select className="field !w-auto !py-2" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => update({ category: '' })} className={`chip ${!category ? 'chip-on' : ''}`}>All</button>
        {categories.map((c) => (
          <button key={c} onClick={() => update({ category: c })} className={`chip ${category === c ? 'chip-on' : ''}`}>
            {c}
          </button>
        ))}
        {q && (
          <button onClick={() => update({ q: '' })} className="chip">Clear search “{q}” ×</button>
        )}
      </div>

      <ErrorAlert message={error} onRetry={() => setReloadKey((k) => k + 1)} />

      {loading ? (
        <Spinner />
      ) : products.length === 0 && !error ? (
        <EmptyState
          icon={PackageSearch}
          title="No products found"
          message="Try a different search term or clear the filters."
          actionLabel="Clear filters"
          actionTo="/"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {showHero && !loading && products.length > 0 && (
        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Sparkles size={15} /> New arrivals appear here as the store adds them.
        </p>
      )}
    </>
  )
}
