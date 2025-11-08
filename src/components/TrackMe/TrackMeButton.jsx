// TrackMeButton.jsx
import React, { useState, useEffect } from "react";
import { db } from "./firebaseConfig";
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot, increment, arrayUnion } from "firebase/firestore";
import { auth } from "./firebaseConfig";
import "./TrackMeButton.scss";

const TrackMeButton = ({ 
  onTrackMe, 
  onStopTracking, 
  isTracking = false,
  currentLocation,
  updateInterval = 30000,
  onSafetyDataUpdate
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [activeTrackingId, setActiveTrackingId] = useState(null);
  const [trackingStats, setTrackingStats] = useState({ locationsRecorded: 0 });
  const [errors, setErrors] = useState({});
  
  // Transport options
  const TRANSPORT_OPTIONS = [
    { value: "", label: "Select mode of transport", disabled: true },
    { value: "walking", label: "🚶 Walking" },
    { value: "cycling", label: "🚴 Cycling" },
    { value: "car", label: "🚗 Car (Personal)" },
    { value: "motorcycle", label: "🏍️ Motorcycle" },
    { value: "rideshare", label: "🚕 Ride-sharing (Uber, Grab, etc.)" },
    { value: "taxi", label: "🚖 Taxi" },
    { value: "public_transport", label: "🚌 Public Transport" },
    { value: "other", label: "❓ Other" }
  ];
  
  // Safety data state
  const [safetyData, setSafetyData] = useState({
    destination: "",
    modeOfTransport: "", // New required field
    travelCompanions: [{ name: "", cell: "", relationship: "" }],
    vehicleLicense: "",
    vehiclePhoto: null,
    vehiclePhotoUrl: "",
    additionalNotes: "",
    emergencyContact: { name: "", cell: "", relationship: "" }
  });

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, [trackingInterval]);

  // Check for active tracking session on component mount
  useEffect(() => {
    checkActiveTrackingSession();
  }, []);

  useEffect(() => {
    if (onSafetyDataUpdate) {
      onSafetyDataUpdate(safetyData);
    }
  }, [safetyData, onSafetyDataUpdate]);

  const validateSafetyData = (data) => {
    const newErrors = {};
    
    // Validate destination (required)
    if (!data.destination?.trim()) {
      newErrors.destination = "Destination is required";
    }
    
    // Validate mode of transport (required)
    if (!data.modeOfTransport) {
      newErrors.modeOfTransport = "Mode of transport is required";
    }
    
    // Travel companions are completely optional - only validate phone format if provided
    data.travelCompanions.forEach((companion, index) => {
      if (companion.cell?.trim() && !/^[\+]?[1-9][\d]{0,15}$/.test(companion.cell.replace(/\s/g, ''))) {
        newErrors[`companionCell-${index}`] = "Please enter a valid phone number";
      }
    });
    
    // Emergency contact validation (if provided)
    if (data.emergencyContact.cell && !/^[\+]?[1-9][\d]{0,15}$/.test(data.emergencyContact.cell.replace(/\s/g, ''))) {
      newErrors.emergencyCell = "Please enter a valid emergency contact number";
    }
    
    return newErrors;
  };

  const checkActiveTrackingSession = async () => {
    if (!auth.currentUser) return;

    try {
      const trackingRef = collection(db, 'trackingSessions');
      const q = query(
        trackingRef,
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'active'),
        orderBy('startedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const activeSession = snapshot.docs[0];
          setActiveTrackingId(activeSession.id);
          setSafetyData(activeSession.data().safetyData || {});
          setIsTracking(true);
          
          // Start tracking UI updates
          startTrackingUI(activeSession.data().safetyData);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error checking active tracking session:", error);
    }
  };

  const storeTrackingSession = async (location, safetyInfo, action = 'start') => {
    if (!auth.currentUser) {
      throw new Error("User must be logged in to track location");
    }

    try {
      if (action === 'start') {
        const trackingData = {
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          safetyData: safetyInfo,
          locations: [{
            lat: location.lat,
            lng: location.lng,
            timestamp: serverTimestamp(),
            accuracy: location.accuracy || null
          }],
          status: 'active',
          startedAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          totalLocations: 1
        };

        const docRef = await addDoc(collection(db, 'trackingSessions'), trackingData);
        setActiveTrackingId(docRef.id);
        return docRef.id;
      } else if (action === 'update' && activeTrackingId) {
        const trackingRef = doc(db, 'trackingSessions', activeTrackingId);
        await updateDoc(trackingRef, {
          locations: arrayUnion({
            lat: location.lat,
            lng: location.lng,
            timestamp: serverTimestamp(),
            accuracy: location.accuracy || null
          }),
          lastUpdated: serverTimestamp(),
          totalLocations: increment(1)
        });
      } else if (action === 'stop' && activeTrackingId) {
        const trackingRef = doc(db, 'trackingSessions', activeTrackingId);
        await updateDoc(trackingRef, {
          status: 'completed',
          endedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error storing tracking data:", error);
      throw error;
    }
  };

  const storeEmergencyContactNotification = async (safetyInfo) => {
    if (!auth.currentUser) return;

    try {
      const notificationData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userName: `${safetyInfo.emergencyContact?.name || auth.currentUser.displayName || 'User'}`,
        safetyData: safetyInfo,
        timestamp: serverTimestamp(),
        type: 'tracking_started',
        message: `Tracking started for ${safetyInfo.destination || 'unknown destination'}`,
        status: 'sent'
      };

      await addDoc(collection(db, 'emergencyNotifications'), notificationData);
    } catch (error) {
      console.error("Error storing emergency notification:", error);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      setIsLocating(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const location = { 
            lat: latitude, 
            lng: longitude,
            accuracy: accuracy,
            timestamp: new Date().toISOString()
          };
          setIsLocating(false);
          resolve(location);
        },
        (error) => {
          setIsLocating(false);
          let errorMessage = "Unable to get your location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied. Please enable location permissions.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }
          reject(new Error(errorMessage));
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
    });
  };

  const startTrackingUI = (safetyInfo) => {
    const interval = setInterval(async () => {
      try {
        const newLocation = await getCurrentLocation();
        setLastUpdate(new Date().toISOString());
        setLocationHistory(prev => [...prev.slice(-9), newLocation]);
        setTrackingStats(prev => ({ 
          ...prev, 
          locationsRecorded: prev.locationsRecorded + 1 
        }));
        
        // Store location update in Firebase
        if (activeTrackingId) {
          await storeTrackingSession(newLocation, safetyInfo, 'update');
        }
        
        if (onTrackMe) {
          onTrackMe(newLocation, safetyInfo);
        }
      } catch (error) {
        console.error("Error updating location:", error);
      }
    }, updateInterval);

    setTrackingInterval(interval);
  };

  const handleStartTracking = async (safetyInfo = null) => {
    try {
      const safetyDataToUse = safetyInfo || safetyData;
      const validationErrors = validateSafetyData(safetyDataToUse);
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setIsLocating(true);
      const location = await getCurrentLocation();
      
      // Store in Firebase
      const trackingId = await storeTrackingSession(location, safetyDataToUse, 'start');
      
      // Send emergency notification
      await storeEmergencyContactNotification(safetyDataToUse);
      
      setLastUpdate(location.timestamp);
      setLocationHistory([location]);
      setTrackingStats({ locationsRecorded: 1 });
      setErrors({});
      
      // Start UI tracking
      startTrackingUI(safetyDataToUse);
      
      if (onTrackMe) {
        onTrackMe(location, safetyDataToUse);
      }
    } catch (error) {
      console.error("Error starting tracking:", error);
      alert(`Unable to start tracking: ${error.message}`);
    }
  };

  const handleStopTracking = async () => {
    if (!window.confirm("Are you sure you want to stop tracking? Your safety session will end.")) {
      return;
    }

    try {
      if (trackingInterval) {
        clearInterval(trackingInterval);
        setTrackingInterval(null);
      }
      
      if (activeTrackingId) {
        await storeTrackingSession(null, safetyData, 'stop');
        setActiveTrackingId(null);
      }
      
      setLastUpdate(null);
      setLocationHistory([]);
      setTrackingStats({ locationsRecorded: 0 });
      setErrors({});
      
      if (onStopTracking) {
        onStopTracking();
      }
    } catch (error) {
      console.error("Error stopping tracking:", error);
      alert("Error stopping tracking. Please try again.");
    }
  };

  const toggleTracking = () => {
    if (isTracking) {
      handleStopTracking();
    } else {
      setShowSafetyModal(true);
    }
  };

  // Safety data handlers
  const handleSafetyDataChange = (field, value, index = null) => {
    if (field.startsWith('companion.')) {
      const companionField = field.split('.')[1];
      const updatedCompanions = [...safetyData.travelCompanions];
      updatedCompanions[index][companionField] = value;
      setSafetyData(prev => ({ ...prev, travelCompanions: updatedCompanions }));
      
      // Clear companion errors when user starts typing (only phone validation errors remain)
      if (errors[`companionCell-${index}`] && companionField === 'cell') {
        setErrors(prev => ({ ...prev, [`companionCell-${index}`]: null }));
      }
    } else if (field.startsWith('emergency.')) {
      const emergencyField = field.split('.')[1];
      setSafetyData(prev => ({ 
        ...prev, 
        emergencyContact: { ...prev.emergencyContact, [emergencyField]: value } 
      }));
      
      if (errors[`emergency${emergencyField}`]) {
        setErrors(prev => ({ ...prev, [`emergency${emergencyField}`]: null }));
      }
    } else {
      setSafetyData(prev => ({ ...prev, [field]: value }));
      
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: null }));
      }
    }
  };

  const addTravelCompanion = () => {
    setSafetyData(prev => ({
      ...prev,
      travelCompanions: [...prev.travelCompanions, { name: "", cell: "", relationship: "" }]
    }));
  };

  const removeTravelCompanion = (index) => {
    if (safetyData.travelCompanions.length > 1) {
      setSafetyData(prev => ({
        ...prev,
        travelCompanions: prev.travelCompanions.filter((_, i) => i !== index)
      }));
    }
  };

  const handleVehiclePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Please select an image smaller than 5MB");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSafetyData(prev => ({ 
          ...prev, 
          vehiclePhoto: file,
          vehiclePhotoUrl: event.target.result 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeVehiclePhoto = () => {
    setSafetyData(prev => ({ 
      ...prev, 
      vehiclePhoto: null,
      vehiclePhotoUrl: "" 
    }));
  };

  const handleSaveSafetyData = () => {
    const validationErrors = validateSafetyData(safetyData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstErrorKey = Object.keys(validationErrors)[0];
      const firstErrorElement = document.querySelector(`[data-field="${firstErrorKey}"]`);
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setShowSafetyModal(false);
    setErrors({});
    handleStartTracking(safetyData);
  };

  const handleCancelSafetyData = () => {
    if (isTracking || Object.keys(safetyData).some(key => safetyData[key] !== "")) {
      if (!window.confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
        return;
      }
    }
    setShowSafetyModal(false);
    setErrors({});
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderTrackIcon = () => {
    if (isLocating) {
      return (
        <svg className="track-me-button__icon locating" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    }
    
    if (isTracking) {
      return (
        <svg className="track-me-button__icon tracking" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    }
    
    return (
      <svg className="track-me-button__icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    );
  };

  return (
    <>
      <div className="track-me-button">
    <button
      className={`track-me-button__main ${isTracking ? 'tracking' : ''} ${isLocating ? 'locating' : ''}`}
      onClick={toggleTracking}
      disabled={isLocating}
      title={isTracking ? "Stop tracking my location" : "Start tracking my location"}
    >
      {renderTrackIcon()}
      <span className="track-me-button__text">
        {isLocating ? "Getting Location..." : isTracking ? "Stop Tracking" : "Track Me"}
      </span>
    </button>

    {/* Tracking status panel */}
    {isTracking && (
      <div className="track-me-button__status">
            <div className="status-header">
              <h3>🛡️ Active Safety Tracking</h3>
              <div className="status-indicator">
                <div className="pulse-dot"></div>
                <span>Live</span>
              </div>
            </div>
            
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Destination:</span>
                <span className="status-value">{safetyData.destination || "Not specified"}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Transport:</span>
                <span className="status-value">
                  {safetyData.modeOfTransport ? 
                    TRANSPORT_OPTIONS.find(opt => opt.value === safetyData.modeOfTransport)?.label.replace(/[^a-zA-Z\s]/g, '').trim() : 
                    "Not specified"
                  }
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Last update:</span>
                <span className="status-value">{formatTime(lastUpdate)}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Locations recorded:</span>
                <span className="status-value">{trackingStats.locationsRecorded}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Session ID:</span>
                <span className="status-value session-id">
                  {activeTrackingId ? activeTrackingId.substring(0, 8) + '...' : 'Not stored'}
                </span>
              </div>
            </div>
            
            <div className="status-actions">
              <button 
                className="edit-safety-btn"
                onClick={() => setShowSafetyModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2"/>
                  <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Edit Safety Info
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Safety Information Modal */}
      {showSafetyModal && (
        <div className="safety-modal-overlay">
          <div className="safety-modal">
            <div className="safety-modal-header">
              <div className="header-content">
                <div className="header-icon">🛡️</div>
                <div>
                  <h2>Safety Information</h2>
                  <p className="modal-subtitle">
                    {isTracking ? "Update your safety details" : "Set up your safety tracking information"}
                  </p>
                </div>
              </div>
              <button 
                className="modal-close"
                onClick={handleCancelSafetyData}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="safety-modal-content">
              <div className="form-section">
                <div className="section-header">
                  <h3>📍 Trip Destination</h3>
                  <span className="required-badge">Required</span>
                </div>
                <input
                  type="text"
                  placeholder="Where are you going? (e.g., Home, Work, Restaurant Name)"
                  value={safetyData.destination}
                  onChange={(e) => handleSafetyDataChange('destination', e.target.value)}
                  className={`form-input ${errors.destination ? 'error' : ''}`}
                  data-field="destination"
                />
                {errors.destination && <span className="error-message">{errors.destination}</span>}
              </div>

              {/* NEW: Mode of Transport Section */}
              <div className="form-section">
                <div className="section-header">
                  <h3>🚗 Mode of Transport</h3>
                  <span className="required-badge">Required</span>
                </div>
                <p className="section-description">How are you traveling to your destination?</p>
                
                <div className="input-group">
                  <label>Transportation Method *</label>
                  <select
                    value={safetyData.modeOfTransport}
                    onChange={(e) => handleSafetyDataChange('modeOfTransport', e.target.value)}
                    className={`form-input ${errors.modeOfTransport ? 'error' : ''}`}
                    data-field="modeOfTransport"
                  >
                    {TRANSPORT_OPTIONS.map(option => (
                      <option 
                        key={option.value} 
                        value={option.value} 
                        disabled={option.disabled}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.modeOfTransport && <span className="error-message">{errors.modeOfTransport}</span>}
                </div>

                {/* Show vehicle fields only if car, motorcycle, or rideshare is selected */}
                {(safetyData.modeOfTransport === 'car' || 
                  safetyData.modeOfTransport === 'motorcycle' || 
                  safetyData.modeOfTransport === 'rideshare') && (
                  <>
                    <div className="input-group">
                      <label>License Plate {safetyData.modeOfTransport === 'rideshare' ? '(Optional)' : ''}</label>
                      <input
                        type="text"
                        placeholder={safetyData.modeOfTransport === 'rideshare' ? "Vehicle license plate (if known)" : "Vehicle license plate"}
                        value={safetyData.vehicleLicense}
                        onChange={(e) => handleSafetyDataChange('vehicleLicense', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="input-group">
                      <label>Vehicle Photo {safetyData.modeOfTransport === 'rideshare' ? '(Recommended)' : ''}</label>
                      <div className="photo-upload">
                        {safetyData.vehiclePhotoUrl ? (
                          <div className="photo-preview">
                            <img src={safetyData.vehiclePhotoUrl} alt="Vehicle" />
                            <button 
                              type="button" 
                              className="remove-photo-btn"
                              onClick={removeVehiclePhoto}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="upload-area">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleVehiclePhotoChange}
                              className="upload-input"
                            />
                            <div className="upload-content">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
                                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
                                <path d="M16 13H8" stroke="currentColor" strokeWidth="2"/>
                                <path d="M16 17H8" stroke="currentColor" strokeWidth="2"/>
                                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                              <span>
                                {safetyData.modeOfTransport === 'rideshare' 
                                  ? "Upload ride-sharing screenshot" 
                                  : "Upload vehicle photo"}
                              </span>
                              <small>Max 5MB • PNG, JPG, JPEG</small>
                            </div>
                          </label>
                        )}
                      </div>
                      {safetyData.modeOfTransport === 'rideshare' && (
                        <small className="helper-text">
                          💡 Tip: Take a screenshot of your ride-sharing app showing driver and vehicle details
                        </small>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>👥 Travel Companions</h3>
                  <span className="optional-badge">Optional</span>
                </div>
                <p className="section-description">Add people you're traveling with for safety (optional)</p>
                
                {safetyData.travelCompanions.map((companion, index) => (
                  <div key={index} className="companion-card" data-field={`companionName-${index}`}>
                    <div className="card-header">
                      <h4>Companion {index + 1}</h4>
                      {safetyData.travelCompanions.length > 1 && (
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeTravelCompanion(index)}
                          aria-label="Remove companion"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="companion-fields">
                      <div className="input-group">
                        <label>Full Name</label>
                        <input
                          type="text"
                          placeholder="Lelo  (optional)"
                          value={companion.name}
                          onChange={(e) => handleSafetyDataChange('companion.name', e.target.value, index)}
                          className={`form-input ${errors[`companionCell-${index}`] ? 'error' : ''}`}
                        />
                      </div>
                      
                      <div className="input-group">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          placeholder="0123456789 (optional)"
                          value={companion.cell}
                          onChange={(e) => handleSafetyDataChange('companion.cell', e.target.value, index)}
                          className={`form-input ${errors[`companionCell-${index}`] ? 'error' : ''}`}
                        />
                        {errors[`companionCell-${index}`] && (
                          <span className="error-message">{errors[`companionCell-${index}`]}</span>
                        )}
                      </div>
                      
                      <div className="input-group">
                        <label>Relationship</label>
                        <input
                          type="text"
                          placeholder="Friend, Colleague, Family (optional)"
                          value={companion.relationship}
                          onChange={(e) => handleSafetyDataChange('companion.relationship', e.target.value, index)}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button 
                  type="button" 
                  className="add-companion-btn"
                  onClick={addTravelCompanion}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Add Companion (Optional)
                </button>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>📝 Additional Notes</h3>
                  <span className="optional-badge">Optional</span>
                </div>
                <textarea
                  placeholder="Any additional information that could help in case of emergency (e.g., specific route, meeting details, special instructions)..."
                  value={safetyData.additionalNotes}
                  onChange={(e) => handleSafetyDataChange('additionalNotes', e.target.value)}
                  className="form-textarea"
                  rows="4"
                />
              </div>

              <div className="modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={handleCancelSafetyData}
                >
                  Cancel
                </button>
                <button 
                  className="save-btn primary"
                  onClick={handleSaveSafetyData}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {isTracking ? "Update Safety Info" : "Start Safety Tracking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrackMeButton;