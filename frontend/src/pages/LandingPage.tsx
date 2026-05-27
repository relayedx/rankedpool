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
        <h1 className="about-header">
          What is rankedpool?
        </h1>
        <div className="about-image-container">
          <img src={aboutImage} alt="rankingDemoImage" className="about-image"/>
        </div>
      </section>
  



    </>
  )
}