import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="nav">
      <div className="logo">
        <span className="logo-badge">NS</span>
        <span>NextStep AI</span>
      </div>
      <div className="nav-actions">
        {user ? (
          <>
            <Link className="button outline" to="/dashboard">
              Dashboard
            </Link>
            <button className="button" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="button outline" to="/login">
              Login
            </Link>
            <Link className="button primary" to="/register">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
