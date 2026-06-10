import { Link } from "react-router-dom";
import './styles/MenuBar.css';

export function MenuBar() {
  return (
    <>
      <div className="menu-container">
        <Link to="/home" className="home-link">Home</Link>
        <Link to="/matches" className="matches-link">Matches</Link>
        <Link to="/friends" className="friends-link">Friends</Link>
      </div>
    </>
  )
}