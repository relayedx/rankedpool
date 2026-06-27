import { NavLink } from "react-router-dom";
import './styles/MenuBar.css';

export function MenuBar() {
  return (
    <>
      <div className="menu-container">
        <NavLink
          to="/home"
          className={({ isActive }) => `home-link${isActive ? ' active-menu-link' : ''}`}
        >
          Home
        </NavLink>
        <NavLink
          to="/matches"
          className={({ isActive }) => `matches-link${isActive ? ' active-menu-link' : ''}`}
        >
          Matches
        </NavLink>
        <NavLink
          to="/friends"
          className={({ isActive }) => `friends-link${isActive ? ' active-menu-link' : ''}`}
        >
          Friends
        </NavLink>
      </div>
    </>
  )
}
