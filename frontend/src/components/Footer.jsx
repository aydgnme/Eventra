import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-fg-3">
        <span>&copy; {new Date().getFullYear()} Eventra &mdash; University Event Management</span>
        <div className="flex items-center gap-4">
          <Link to="/about" className="hover:text-fg transition-colors">About</Link>
          <Link to="/events" className="hover:text-fg transition-colors">Events</Link>
          <span>USV Suceava</span>
        </div>
      </div>
    </footer>
  )
}
