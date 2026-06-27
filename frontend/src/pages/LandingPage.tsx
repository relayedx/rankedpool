import logo from '../images/rankedpool-logo.png'
import demoImage from '../images/rankedpool-demo-phone.png'
import './styles/LandingPage.css'
import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <main className="landing-page">
      <nav>
        <div className="nav-bar">
          <div className="nav-logo">
              <a href="#">
                <img src={logo} alt="logo" className="logo"/>
              </a>
          </div>
          <Link to="/login" className="nav-auth">Login / Signup</Link>
        </div>
      </nav>
      <section className="landing-hero">
        <img src={demoImage} alt="rankedpool app preview on a phone" className="hero-demo-image"/>
        <div className="hero-scrim"></div>
        <div className="hero-content">
          <p className="hero-kicker">casual-competitive pool ranking</p>
          <h1 className="hero-title">rankedpool</h1>
          <p className="hero-copy">
            Report matches, confirm results, and climb through ranked tiers with a simple elo system built for real games at the table.
          </p>
          <Link to="/login" className="hero-action">Start ranking</Link>
        </div>
      </section>

      <section className="about-section">
        <div className="about-container">
          <div className="about-copy">
            <p className="section-label">how it works</p>
            <h2 className="about-header">A cleaner way to track competitive pool.</h2>
            <p className="about-info">
              rankedpool gives players a lightweight way to compete, report wins and losses, and move through ranks across 8-ball, 9-ball, and 10-ball. Every match starts with a player report and becomes official after the opponent reviews it.
            </p>
          </div>
          <div className="feature-rail" aria-label="rankedpool flow">
            <div className="feature-step">
              <span className="feature-number">01</span>
              <p>Report</p>
            </div>
            <div className="feature-step">
              <span className="feature-number">02</span>
              <p>Confirm</p>
            </div>
            <div className="feature-step">
              <span className="feature-number">03</span>
              <p>Rank up</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="landing-contact">
        <a
          href="https://instagram.com/rankedpool"
          className="contact-link"
          target="_blank"
          rel="noreferrer"
          aria-label="Contact rankedpool on Instagram"
        >
          Contact us
        </a>
      </footer>
    </main>
  )
}
