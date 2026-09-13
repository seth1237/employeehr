import { Tinos } from "next/font/google"
import Link from "next/link"
import { Hero } from "@/components/home/hero"
import { AppIcon } from "@/components/home/landing-icons"
import { CASES, LOGIN_HREF, MODULES, NAV, SIGNUP_HREF, STEPS } from "@/lib/landing/site"
import "./landing.css"

const tinos = Tinos({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
})

export function LandingPage() {
  return (
    <div className={`elevate-landing ${tinos.variable}`}>
      <Hero />

      <section className="landing-section" id="how-it-works" aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <p className="landing-lead">
          The scene above is the product: modules come in, the hub coordinates them,
          and finished workflows leave the other side.
        </p>
        <ol className="step-grid">
          {STEPS.map((step) => (
            <li key={step.n} className="quiet-card">
              <span className="step-n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section" id="modules" aria-labelledby="modules-heading">
        <h2 id="modules-heading">Modules</h2>
        <p className="landing-lead">
          Inventory, people, production, and the warehouse already sit on the same plane.
        </p>
        <ul className="module-grid">
          {MODULES.map((module) => (
            <li key={module.kind} className="quiet-card module-card">
              <AppIcon kind={module.kind} size={28} />
              <h3>{module.title}</h3>
              <p>{module.liner}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-section" id="use-cases" aria-labelledby="cases-heading">
        <h2 id="cases-heading">Use cases</h2>
        <p className="landing-lead">
          The cards leaving the hub are the work the company already does, now on one trail.
        </p>
        <ul className="use-grid">
          {CASES.map((item) => (
            <li key={item.name} className="quiet-card use-card">
              <div className="use-apps" aria-hidden="true">
                {item.apps.map((app) => (
                  <AppIcon key={`${item.name}-${app}`} kind={app} size={18} />
                ))}
              </div>
              <h3>{item.name}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-section close-cta" aria-labelledby="close-heading">
        <h2 id="close-heading">
          Your company,
          <br />
          on one rail
        </h2>
        <p className="landing-lead">Open a workspace, or return to the one you already run.</p>
        <div className="hero-actions landing-actions">
          <Link className="primary" href={SIGNUP_HREF}>
            Signup
          </Link>
          <Link className="secondary" href={LOGIN_HREF}>
            Login
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <Link href="/" className="brand" aria-label="Elevate home">
          <img src="/elevate-logo.png" alt="Elevate logo" />
        </Link>
        <nav aria-label="Footer">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href={LOGIN_HREF}>Login</Link>
          <Link href={SIGNUP_HREF}>Signup</Link>
        </nav>
        <p>Elevate — inventory, payroll, procurement, and manufacturing in one hub.</p>
      </footer>
    </div>
  )
}
