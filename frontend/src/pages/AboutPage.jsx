import { Link } from 'react-router-dom'
import {
  ArrowRight, CalendarDays, CheckCircle2, FileText, GraduationCap, ShieldCheck, Users,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import useDocumentTitle from '../hooks/useDocumentTitle'

const FLOW = [
  {
    icon: FileText,
    title: 'Organizers submit events',
    text: 'Event details, location, schedule, capacity, materials, and registration settings are managed in one place.',
  },
  {
    icon: ShieldCheck,
    title: 'Admins validate publication',
    text: 'Submitted events can be reviewed, approved, rejected, published, or unpublished by platform administrators.',
  },
  {
    icon: CalendarDays,
    title: 'Students browse and plan',
    text: 'The public event list and calendar help students discover upcoming activities and open event details quickly.',
  },
  {
    icon: CheckCircle2,
    title: 'Attendance is tracked',
    text: 'Registrations, waitlists, QR tickets, check-in, feedback, and reports close the event lifecycle.',
  },
]

const AUDIENCES = [
  {
    icon: GraduationCap,
    title: 'Students',
    items: ['Browse events', 'Register or join the waitlist', 'Use QR tickets', 'Leave feedback after events'],
  },
  {
    icon: Users,
    title: 'Organizers',
    items: ['Create and edit events', 'Manage participants', 'Upload materials', 'Follow capacity and status'],
  },
  {
    icon: ShieldCheck,
    title: 'Admins',
    items: ['Validate events', 'Manage users', 'Review platform reports', 'Track audit activity'],
  },
]

export default function AboutPage() {
  useDocumentTitle('About')
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-500">
              USV Event Management Platform
            </p>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-10 items-end">
              <div>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg">
                  A single flow for publishing, discovering, and attending university events.
                </h1>
                <p className="mt-5 max-w-3xl text-base sm:text-lg leading-relaxed text-fg-2">
                  Eventra follows the same portal logic as a university event hub: public event discovery,
                  calendar planning, role-based event management, registration, and post-event reporting.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-bg p-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-lg bg-brand-500 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-fg">Portal Logic</p>
                    <p className="text-xs text-fg-3">Events, calendar, roles, registrations</p>
                  </div>
                </div>
                <Link
                  to="/events"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400 transition-colors"
                >
                  Explore events
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-fg">How the platform works</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {FLOW.map((step) => (
              <article key={step.title} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-brand-500" />
                </div>
                <h3 className="font-semibold text-fg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-3">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pb-14">
          <h2 className="text-2xl font-bold text-fg">Role-based access</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {AUDIENCES.map((group) => (
              <article key={group.title} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-surface-alt flex items-center justify-center">
                    <group.icon className="w-5 h-5 text-brand-500" />
                  </div>
                  <h3 className="font-semibold text-fg">{group.title}</h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-fg-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
