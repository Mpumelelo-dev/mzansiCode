import React from "react";
import "./NavBar.scss";

const NavBar = () => {
  React.useEffect(() => {
    document.title = "SafeMzansi - Safe Route Planning";
  }, []);

  return (
    <div className="navbar">
      <div className="navbar__content">
        <div className="navbar__logo">
          {/* Ocean icon replacing the logo */}
          <div className="navbar__icon ocean-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5 0 1.12-.38 2.16-1 3h-8c-.62-.84-1-1.88-1-3 0-2.76 2.24-5 5-5z"/>
            </svg>
          </div>
          <div className="navbar__content-texts">
            <p className="navbar__content-title">SafeMzansi</p>
            <p className="navbar__content-subtitle">
              Navigate the City, Aware.
            </p>
          </div>
        </div>
        
        {/* Optional: Add a cute decorative element */}
        <div className="navbar__decoration">
          <div className="decoration__dot"></div>
          <div className="decoration__dot"></div>
          <div className="decoration__dot"></div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;