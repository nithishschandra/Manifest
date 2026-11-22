import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, LogOut, Package, Search, ShoppingBag, ShoppingCart, User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const tabClass = ({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`

function SearchBox({ className, term, setTerm, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className={className} role="search">
      <Search className="absolute left-3 top-3 text-slate-400" size={18} />
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search products..."
        aria-label="Search products"
        className="field field-with-icon"
      />
    </form>
  )
}

function Header() {
  const { user, logout, isAdmin } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [term, setTerm] = useState(() => new URLSearchParams(location.search).get('q') || '')

  useEffect(() => {
    if (location.pathname === '/') setTerm(new URLSearchParams(location.search).get('q') || '')
  }, [location.pathname, location.search])

  function submitSearch(e) {
    e.preventDefault()
    const q = term.trim()
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
  }

  return (
    <header className="site-header sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-xl font-black tracking-tight">
          <span className="rounded-xl bg-brand p-2 text-white"><ShoppingBag size={20} /></span>
          <span>shoply<span className="text-brand">.</span></span>
        </Link>

        <SearchBox className="relative ml-auto hidden max-w-xl flex-1 md:block" term={term} setTerm={setTerm} onSubmit={submitSearch} />

        <Link to="/cart" className="icon-btn ml-auto md:ml-0" aria-label={`Cart, ${count} items`}>
          <ShoppingCart size={20} />
          {count > 0 && <span className="count">{count}</span>}
        </Link>

        {user ? (
          <div className="flex items-center gap-1">
            <Link to="/profile" className="icon-btn" title="My profile">
              <User size={19} /><span className="hidden text-sm font-semibold sm:inline">{user.name}</span>
            </Link>
            <button
              className="icon-btn text-rose-600"
              title="Sign out"
              onClick={() => { logout(); navigate('/') }}
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="hidden items-center gap-2 sm:flex">
            <Link to="/login" className="secondary">Sign in</Link>
            <Link to="/register" className="primary">Create account</Link>
          </div>
        )}
      </div>

      <div className="border-t px-5 py-2 md:hidden">
        <SearchBox className="relative" term={term} setTerm={setTerm} onSubmit={submitSearch} />
      </div>

      {/* Mobile navigation */}
      <nav className="flex gap-1 overflow-x-auto border-t px-5 py-2 text-sm font-semibold md:hidden" aria-label="Main">
        <NavLink to="/" end className={tabClass}>Shop</NavLink>
        {user && <NavLink to="/orders" className={tabClass}>My orders</NavLink>}
        {user && <NavLink to="/profile" className={tabClass}>Profile</NavLink>}
        {isAdmin && <NavLink to="/admin" className={tabClass}>Admin</NavLink>}
        {!user && <NavLink to="/login" className={tabClass}>Sign in</NavLink>}
        {!user && <NavLink to="/register" className={tabClass}>Create account</NavLink>}
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer border-t bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-slate-400">
        <span>© {new Date().getFullYear()} Shoply · Built with React, FastAPI and PostgreSQL</span>
        <span>Demo store: no real payments are taken.</span>
      </div>
    </footer>
  )
}

export default function Layout() {
  const { user, isAdmin } = useAuth()
  const { count } = useCart()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col text-ink">
      <Header />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-5 py-7 lg:grid-cols-[220px_1fr]">
        <aside className="site-sidebar hidden h-fit rounded-2xl border bg-white p-3 lg:block">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">Menu</div>
          <NavLink to="/" end className="nav"><ShoppingBag size={17} />Shop</NavLink>
          <NavLink to="/cart" className="nav"><ShoppingCart size={17} />Cart{count > 0 && ` (${count})`}</NavLink>
          {user && <NavLink to="/orders" className="nav"><Package size={17} />My orders</NavLink>}
          {user && <NavLink to="/profile" className="nav"><User size={17} />My profile</NavLink>}
          {isAdmin && <NavLink to="/admin" className="nav"><LayoutDashboard size={17} />Admin</NavLink>}
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}
