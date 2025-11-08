import React, { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./Dictionary.scss";

const Dictionary = () => {
  const [open, setOpen] = useState(true);

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <div className={`dictionary ${open ? "dictionary--open" : "dictionary--closed"}`}>
      {/* Header */}
      <div className="dictionary__header" onClick={toggleOpen}>
        <h4 className="dictionary__title">🛡️ Crime Safety Guide</h4>
        {open ? (
          <FaChevronUp className="dictionary__icon" />
        ) : (
          <FaChevronDown className="dictionary__icon" />
        )}
      </div>

      {/* Content */}
      {open && (
        <div className="dictionary__content">
          {/* Crime Risk Levels */}
          <h5 className="dictionary__subtitle">Crime Risk Levels</h5>
          <ul className="dictionary__list">
            <li>
              <span
                className="color-dot"
                style={{ backgroundColor: "#00FF00" }}
              ></span>{" "}
              Safe Area 
            </li>
            <li>
              <span
                className="color-dot"
                style={{ backgroundColor: "#FFFF00" }}
              ></span>{" "}
              Moderate Risk 
            </li>
            <li>
              <span
                className="color-dot"
                style={{ backgroundColor: "#FF0000" }}
              ></span>{" "}
              High Risk 
            </li>
          </ul>

         

          {/* Safety Terms */}
          <h5 className="dictionary__subtitle">Safety Terms</h5>
          <ul className="dictionary__list dictionary__list--terms">
            <li>
              <strong>Hotspot</strong> - Area with concentrated criminal activity
            </li>
            <li>
              <strong>Safe Route</strong> - Path avoiding high and moderate crime areas
            </li>
            <li>
              <strong>Risk Level</strong> - Classification based on crime density
            </li>
            <li>
              <strong>Crime Density</strong> - Number of crimes per area over time
            </li>
            <li>
              <strong>Predictive Safety</strong> - Forecast of area safety based on historical data
            </li>
            <li>
              <strong>Community Watch</strong> - Areas with active neighborhood monitoring
            </li>
          </ul>

          {/* Safety Icons */}
          <h5 className="dictionary__subtitle">Safety Status Icons</h5>
          <ul className="dictionary__list">
            <li>
              <span className="safety-icon">🟢</span>
              Safe - Low crime risk
            </li>
            <li>
              <span className="safety-icon">🟡</span>
              Moderate - Some crime risk present
            </li>
            <li>
              <span className="safety-icon">🔴</span>
              High Risk - Significant crime risk
            </li>
            <li>
              <span className="safety-icon">👤</span>
              Your Current Location
            </li>
            <li>
              <span className="safety-icon">📍</span>
              Destination Location
            </li>
            <li>
              <span className="safety-icon">🟢</span>
              Active Tracking Location
            </li>
          </ul>

 {/* Route Safety Colors */}
          <h5 className="dictionary__subtitle">Route Safety Colors</h5>
          <ul className="dictionary__list">
            <li>
              <span
                className="color-dot"
                style={{ backgroundColor: "#00FF00" }}
              ></span>{" "}
              Safe Route - No high or moderate risk areas
            </li>
            <li>
              <span
                className="color-dot"
                style={{ backgroundColor: "#FFFF00" }}
              ></span>{" "}
              Moderate Risk Route - Passes through moderate risk areas
            </li>
            <li>
              <span
                className="color-dot"
                style={{ backgroundColor: "#FF0000" }}
              ></span>{" "}
              High Risk Route - Passes through high risk areas
            </li>
          </ul>


          {/* Travel Safety Tips */}
          <h5 className="dictionary__subtitle">Travel Safety Tips</h5>
          <ul className="dictionary__list">
            <li>
              <span className="tip-icon">🎯</span>
              Use Safe Route feature for navigation
            </li>
            <li>
              <span className="tip-icon">👀</span>
              Stay aware of crime hotspots
            </li>
            <li>
              <span className="tip-icon">📱</span>
              Enable tracking for emergency contacts
            </li>
            <li>
              <span className="tip-icon">🕒</span>
              Avoid high-risk areas during late hours
            </li>
            <li>
              <span className="tip-icon">🚶</span>
              Stick to well-lit, populated routes
            </li>
            <li>
              <span className="tip-icon">📞</span>
              Keep emergency contacts updated
            </li>
          </ul>

          {/* Feature Guide */}
          <h5 className="dictionary__subtitle">App Features</h5>
          <ul className="dictionary__list">
            <li>
              <span className="feature-icon">🗺️</span>
              Crime Hotspots - Visual crime density areas
            </li>
            <li>
              <span className="feature-icon">🛡️</span>
              Safe Routing - Avoids high-risk areas
            </li>
            <li>
              <span className="feature-icon">📊</span>
              Safety Forecast - Predictive crime analysis
            </li>
            <li>
              <span className="feature-icon">🏘️</span>
              Communities - Neighborhood safety information
            </li>
            <li>
              <span className="feature-icon">📍</span>
              Live Tracking - Real-time location sharing
            </li>
            <li>
              <span className="feature-icon">🤖</span>
              Safety Assistant - AI-powered safety tips
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dictionary;