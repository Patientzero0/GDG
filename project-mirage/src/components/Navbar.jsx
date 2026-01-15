import React from 'react';
import { Link } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import GoogleTranslate from './GoogleTranslate';

const Navbar = () => {
  return (
    <>
      <div className="nav-ambient-glow"></div>
      <nav className="fixed-nav glass-nav">
        <div className="nav-inner">
          <div className="nav-left">
            <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
              MIRAGE
            </Link>
          </div>
          <ul className="nav-links">
            <li className="nav-item"><a href="#about">About</a></li>
            <li className="nav-item"><a href="#pricing">Pricing</a></li>
            <li className="nav-item"><a href="#contact">Contact</a></li>
          </ul>
          <div className="nav-right">
            <GoogleTranslate />
            <ThemeSwitcher />
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;