import logo from '../images/rankedpool-logo.png'
import aboutImage from '../images/rankedpool-about-image.png'
import './styles/LandingPage.css'

export function LandingPage() {
  return (
    <>
      <nav>
        <div className="nav-bar">
          <div className="nav-logo">
              <a href="#">
                <img src={logo} alt="logo" className="logo"/>
              </a>
          </div>
          <a href="#" className="nav-auth">Login / Signup</a>
        </div>
      </nav>
      <section className="about-section">
        <div className="about-container">
          <h1 className="about-header">
            What is rankedpool?
          </h1>
          <img src={aboutImage} alt="rankingDemoImage" className="about-image"/>
          <p className="about-info">
            rankedpool is a casual-competitive ranking platform where players can create profiles, compete against other rankedpool users, and climb the leaderboard through an elo-based ranking system. After each pool match, wether it be 8ball, 9ball or 10ball. Players report wins and losses to gain or lose elo, allowing them to rank up or derank across multiple competitive tiers. Users can track match history, view player profiles, and compare rankings, creating a structured and competitive environment built entirely around matches played between verified members of the platform.
          </p>
        </div>
      </section>
  



    </>
  )
}