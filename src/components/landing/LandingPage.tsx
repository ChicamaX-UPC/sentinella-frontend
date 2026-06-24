"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const PLANS = [
  {
    code: "economy",
    name: "Economy",
    first: "$190",
    recur: "$90/mes desde el 2.º mes",
    detail: "5 dispositivos · $90 web + $100 IoT",
    featured: false,
  },
  {
    code: "premium",
    name: "Premium",
    first: "$380",
    recur: "$140/mes desde el 2.º mes",
    detail: "12 dispositivos · $140 web + $240 IoT",
    featured: true,
  },
  {
    code: "max",
    name: "Max",
    first: "$620",
    recur: "$220/mes desde el 2.º mes",
    detail: "20 dispositivos · $220 web + $400 IoT",
    featured: false,
  },
] as const;

export function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("landing-body");
    return () => document.body.classList.remove("landing-body");
  }, []);

  return (
    <>
      <link rel="stylesheet" href="/landing/landing.css" />
      <a className="skip-link" href="#main">
        Ir al contenido
      </a>

      <header className="site-header" id="inicio">
        <div className="container header-inner">
          <a href="#inicio" className="brand" aria-label="Sentinella inicio">
            <span className="brand-text">Sentinella</span>
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={navOpen}
            aria-controls="mainNav"
            aria-label="Abrir menú"
            onClick={() => setNavOpen((o) => !o)}
          >
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
          </button>
          <nav className={`main-nav${navOpen ? " is-open" : ""}`} id="mainNav" aria-label="Principal">
            <ul className="nav-list">
              <li><a href="#inicio" className="is-active">Inicio</a></li>
              <li><a href="#features">Capacidades</a></li>
              <li><a href="#benefits">Implementación</a></li>
              <li><a href="#pricing">Planes</a></li>
              <li><a href="#contact">Contacto</a></li>
            </ul>
            <div className="header-actions">
              <Link className="btn btn-outline-light btn-pill btn-nav" href="/dashboard">
                Ir al panel
              </Link>
              <Link className="btn btn-primary btn-pill btn-nav" href="/register">
                Registrar empresa
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero hero--split" aria-labelledby="hero-title">
          <div className="container hero-split-inner">
            <div className="hero-copy">
              <h1 id="hero-title" className="hero-title">
                Monitoreo de relaves en tiempo real para operaciones mineras
              </h1>
              <p className="hero-lede">
                Alertas, gemelo digital, reportes normativos y operación en campo — una plataforma
                diseñada para empresas mineras que gestionan tranques de relaves.
              </p>
              <div className="hero-actions">
                <Link href="/register" className="btn btn-primary btn-pill">
                  Registrar mi empresa
                </Link>
                <Link href="/dashboard" className="btn btn-outline-light btn-pill">
                  Ir al panel
                </Link>
              </div>
            </div>
            <figure className="hero-art-figure">
              <div className="hero-art">
                <Image
                  className="hero-art-img"
                  src="/landing/hero-dashboard.jpeg"
                  alt="Panel de monitoreo de tranques de relaves"
                  width={1024}
                  height={572}
                  priority
                />
              </div>
            </figure>
          </div>
        </section>

        <section className="stats-section" aria-label="Métricas">
          <div className="container stats-grid">
            <article className="stat-card">
              <p className="stat-value mono">99.9%</p>
              <p className="stat-label">Disponibilidad SLA</p>
            </article>
            <article className="stat-card">
              <p className="stat-value mono">24/7</p>
              <p className="stat-label">Monitoreo continuo</p>
            </article>
            <article className="stat-card">
              <p className="stat-value mono">IoT</p>
              <p className="stat-label">Nodos en tranque</p>
            </article>
          </div>
        </section>

        <section className="capabilities-section" id="features">
          <div className="container">
            <h2 className="cap-main-title">Capacidades para su operación</h2>
            <p className="cap-main-sub">
              Todo lo necesario para supervisar infraestructura crítica de relaves en un solo panel.
            </p>
            <div className="capabilities-grid">
              {[
                ["Monitoreo en tiempo real", "Métricas críticas del tranque con actualización continua."],
                ["Alertas automáticas", "Notificaciones por app, correo y panel de control."],
                ["Trazabilidad blockchain", "Registro inmutable para auditorías y cumplimiento."],
                ["Panel ejecutivo", "KPIs y estado operativo para gerencia de planta."],
                ["Reportes normativos", "Generación de informes para autoridades y auditorías."],
                ["App móvil operarios", "Rondas de inspección y checklist en campo, con modo offline."],
              ].map(([title, text]) => (
                <article key={title} className="capability-card reveal">
                  <h3 className="capability-title">{title}</h3>
                  <p className="capability-text">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="flow-section" id="benefits">
          <div className="container">
            <h2 className="flow-heading">Flujo de implementación</h2>
            <div className="flow-timeline">
              {[
                "Instale nodos IoT en el depósito de relaves",
                "El sistema detecta anomalías en tiempo real",
                "Reciba alertas automáticas en app o correo",
                "Genere reportes normativos con un clic",
              ].map((text, i) => (
                <div
                  key={text}
                  className={`flow-step${i === 0 ? " flow-step--active" : ""}`}
                  aria-label={`Paso ${i + 1}: ${text}`}
                >
                  <span className="flow-dot" aria-hidden="true">
                    {i + 1}
                  </span>
                  <p className="flow-step-label">Paso {i + 1}</p>
                  <p className="flow-step-text">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-section" id="pricing">
          <div className="container">
            <h2 className="pricing-heading">Planes para empresas mineras</h2>
            <p className="pricing-sub">Suscripción mensual con cobro automático a tarjeta guardada.</p>
            <div className="plans-grid plans-grid--dark">
              {PLANS.map((plan) => (
                <article
                  key={plan.code}
                  className={`plan-card plan-card--dark${plan.featured ? " plan-card--featured-dark" : ""}`}
                >
                  {plan.featured ? <span className="plan-badge">Más popular</span> : null}
                  <p className="plan-name">{plan.name}</p>
                  <p className="plan-first">
                    <strong>{plan.first}</strong> <span>1.er mes</span>
                  </p>
                  <p className="plan-recur">{plan.recur}</p>
                  <p className="plan-fine">{plan.detail}</p>
                  <Link
                    href={`/register?plan=${plan.code}`}
                    className={`btn btn-block ${plan.featured ? "btn-primary" : "btn-outline-light"}`}
                  >
                    Elegir plan
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="container contact-inner">
            <h2 className="contact-title">Solicitar demostración</h2>
            <p className="contact-sub">
              Escríbanos a{" "}
              <a href="mailto:ventas@sentinella.demo" className="text-sky-400">
                ventas@sentinella.demo
              </a>{" "}
              o regístrese para activar su empresa en minutos.
            </p>
            <Link href="/register" className="btn btn-primary btn-block contact-submit">
              Registrar empresa minera
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a href="#inicio" className="brand brand--footer">
              <span className="brand-text">Sentinella</span>
            </a>
            <p className="footer-tagline">Monitoreo de relaves — ChicamaX</p>
          </div>
          <nav className="footer-nav" aria-label="Legal">
            <Link href="/login">Iniciar sesión</Link>
            <Link href="/dashboard">Panel</Link>
          </nav>
          <p className="footer-copy">© {new Date().getFullYear()} Sentinella. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  );
}
