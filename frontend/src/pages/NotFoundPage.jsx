import { Link } from 'react-router-dom'
import useDocumentTitle from '../lib/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="panel py-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-black">We could not find that page</h1>
      <p className="mt-2 text-slate-500">The link may be broken, or the page may have moved.</p>
      <Link to="/" className="primary mt-6">Back to the shop</Link>
    </div>
  )
}
