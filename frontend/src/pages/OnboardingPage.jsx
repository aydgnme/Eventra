import { Link } from 'react-router-dom'
import { Calendar, Users, BarChart3, Shield, ArrowRight, Sparkles, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  {
    icon: Calendar,
    title: 'Precision Scheduling',
    desc: 'Launch and manage campus events with real-time capacity management and automated waitlist logic.',
    span: 'md:col-span-2',
  },
  {
    icon: Users,
    title: 'Seamless Registration',
    desc: 'Frictionless one-tap registration for students with automated calendar synchronization.',
    span: '',
  },
  {
    icon: BarChart3,
    title: 'Data-Driven Insights',
    desc: 'Comprehensive dashboards providing attendance metrics, engagement levels, and exportable analytics.',
    span: '',
  },
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    desc: 'Robust role-based access control ensuring data privacy and secure platform administration.',
    span: 'md:col-span-2',
  },
]

const STATS = [
  { value: '12k+', label: 'Events Hosted' },
  { value: '45k+', label: 'Registrations' },
  { value: '200+', label: 'Organizers' },
  { value: '98%', label: 'Satisfaction' },
]

export default function OnboardingPage() {
  const { theme, toggle } = useTheme()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient blurs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-usv-blue/8 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] bg-usv-gold/6 rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Calendar className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-lg text-fg tracking-tight">Eventra</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-xl bg-surface/60 backdrop-blur border border-border/50 text-fg-2 hover:text-fg transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user ? (
            <Link
              to="/events"
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
            >
              Open App
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex px-4 py-2.5 rounded-xl text-fg-2 hover:text-fg text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-28 text-center">
        <div className="flex justify-center mb-8">
          <div className="relative w-40 h-40 sm:w-52 sm:h-52">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-500/20 via-usv-blue/15 to-usv-gold/10 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-brand-500/30 to-usv-blue/20 backdrop-blur-sm border border-brand-500/20 flex items-center justify-center">
              <Calendar className="w-16 h-16 sm:w-20 sm:h-20 text-brand-500 drop-shadow-lg" />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-sm font-medium text-brand-500">USV Event Management Platform</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-fg leading-[1.1] tracking-tight mb-6 text-white">
          Events that
          <br />
          <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-usv-blue bg-clip-text text-transparent">
            Ignite the Community.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-fg-2 max-w-2xl mx-auto leading-relaxed mb-10 text-gray-300">
          Discover, organize, and attend the most impactful university events.
          The unified platform for students, faculty, and administrators at
          <strong> Universitatea Stefan cel Mare din Suceava</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={user ? '/events' : '/register'}
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-base transition-all shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40"
          >
            {user ? 'Browse Events' : 'Create Free Account'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to={user ? '/dashboard' : '/login'}
            className="px-8 py-4 rounded-2xl bg-surface/80 backdrop-blur border border-border/60 text-fg font-semibold text-base hover:bg-surface transition-all"
          >
            {user ? 'My Dashboard' : 'Sign In'}
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="text-center p-6 rounded-2xl bg-surface/60 backdrop-blur border border-border/40"
            >
              <p className="text-3xl sm:text-4xl font-extrabold text-fg mb-1">{s.value}</p>
              <p className="text-sm text-fg-3 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — Bento Grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="flex flex-col md:flex-row items-center gap-12 mb-16">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl font-bold text-fg mb-4">Everything you need</h2>
            <p className="text-fg-2 max-w-lg mx-auto md:mx-0 text-lg">
              One platform for the entire event lifecycle — from creation to post-event analytics.
            </p>
          </div>
          <div className="relative w-40 h-40 sm:w-52 sm:h-52">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-usv-gold/15 to-brand-500/10 animate-pulse" />
            <div className="absolute inset-3 rounded-xl bg-gradient-to-br from-usv-gold/20 to-brand-500/15 backdrop-blur-sm border border-usv-gold/20 flex items-center justify-center">
              <Sparkles className="w-14 h-14 sm:w-18 sm:h-18 text-usv-gold drop-shadow-lg" />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`group p-6 rounded-2xl bg-surface/70 backdrop-blur border border-border/40 hover:border-brand-500/30 transition-all ${f.span}`}
            >
              <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/15 transition-colors">
                <f.icon className="w-5 h-5 text-brand-500" />
              </div>
              <h3 className="text-lg font-semibold text-fg mb-2">{f.title}</h3>
              <p className="text-fg-2 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-800 via-navy-600 to-brand-700" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,.2) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative px-8 py-16 sm:px-14 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-md mx-auto">
              Join thousands of students and organizers already using Eventra.
            </p>
            <Link
              to={user ? '/events' : '/register'}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-navy-800 font-semibold text-base hover:bg-white/90 transition-all shadow-xl"
            >
              {user ? 'Go to Events' : 'Sign Up Free'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-8 text-center text-fg-3 text-sm">
        &copy; {new Date().getFullYear()} Eventra &middot; Universitatea Stefan cel Mare din Suceava
      </footer>
    </div>
  )
}
