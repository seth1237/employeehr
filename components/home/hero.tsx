"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AutomationScene } from "@/components/home/automation-scene";
import { LOGIN_HREF, NAV, SIGNUP_HREF } from "@/lib/landing/site";

export function Hero() {
  const [paused, setPaused] = useState(false);
  const [restart, setRestart] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest("input,textarea,select,button,a") || target.isContentEditable)
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setPaused((value) => !value);
      }
      if (event.key.toLowerCase() === "r") {
        setRestart((value) => value + 1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="hero-stage">
      <div className="reference-layout">
        <header className="site-header">
          <Link
            href="/"
            className="brand"
            aria-label="Elevate home"
            onClick={() => setRestart((value) => value + 1)}
          >
            <img src="/elevate-logo.png" alt="Elevate logo" />
          </Link>
          <nav aria-label="Main navigation" className={menuOpen ? "mobile-open" : ""}>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link className="mobile-login" href={LOGIN_HREF} onClick={() => setMenuOpen(false)}>
              Login
            </Link>
          </nav>
          <div className="header-actions">
            <Link className="login-link" href={LOGIN_HREF}>
              Login
            </Link>
            <Link className="call-button" href={SIGNUP_HREF}>
              Signup
            </Link>
          </div>
          <button
            className="menu-toggle"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </header>

        <section className="hero-copy" aria-labelledby="hero-heading">
          <h1 id="hero-heading">
            Turn Manual Tasks
            <br />
            into Automations
          </h1>
          <p>
            Automate inventory, payroll, procurement, and more, with
            <br className="desktop-break" /> expert help and enterprise-grade AI
            integrations.
          </p>
          <div className="hero-actions">
            <Link className="primary" href={SIGNUP_HREF}>
              Signup
            </Link>
            <Link className="secondary" href={LOGIN_HREF}>
              Login
            </Link>
          </div>
        </section>

        <AutomationScene paused={paused} restart={restart} />

        <div className="motion-controls">
          <button
            type="button"
            aria-label={paused ? "Play animation" : "Pause animation"}
            title="Space: play / pause"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "▶" : "Ⅱ"}
          </button>
          <button
            type="button"
            aria-label="Replay animation"
            title="R: replay animation"
            onClick={() => {
              setRestart((value) => value + 1);
              setPaused(false);
            }}
          >
            ↺
          </button>
        </div>
      </div>
    </div>
  );
}
