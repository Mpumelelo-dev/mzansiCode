import React, { useEffect, useState, useRef } from "react";
import Chatbot from "../Chatbot/Chatbot";
import PredictiveDashboard from '../PredictiveDashboard/PredictiveDashboard';
import Communities from '../Communities/Communities';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Circle,
  DirectionsRenderer,
  InfoWindow,
  Autocomplete,
  Polyline
} from "@react-google-maps/api";
import Dictionary from "../Dictionary/Dictionary";
import "./MapComponent.scss";
import axios from 'axios'; // Add axios for API calls

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const RADIUS = 700; // meters for crime hotspots
const MAX_DIST_KM = 1.0;

// Original crime level classification based on crime count for radius
const getCrimeLevelForRadius = (crimeCount) => {
  if (crimeCount > 270) return "high";    // High: >270 crimes
  if (crimeCount >= 230) return "medium"; // Moderate: 230-270 crimes
  return "low";                           // Safe: <230 crimes
};

const getMarkerColor = (type) => {
  if (!type) return "red";
  const t = type.trim().toLowerCase();
  switch (t) {
    case "robberys":
      return "yellow";
    case "sexual offences.":
      return "purple";
    case "common assaults":
      return "orange";
    case "burglarys":
      return "pink";
    case "assaults":
      return "yellow";
    case "murders":
      return "purple";
    case "thefts":
      return "violet";
    case "carjackings":
      return "green";
    case "arsons":
      return "red";
    default:
      return "red";
  }
};

function haversine(c1, c2) {
  const R = 6371; // km
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(c2.lat - c1.lat);
  const dLon = toRad(c2.lng - c1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1.lat)) * Math.cos(toRad(c2.lat)) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper function to calculate peak hours (mock implementation)
const calculatePeakHours = (neighborhood) => {
  // In a real app, you would analyze time data from your crime points
  const hours = ['6 PM - 9 PM', '12 PM - 3 PM', '9 PM - 12 AM'];
  return hours[neighborhood.crimeCount % hours.length];
};

// Helper function to calculate peak days (mock implementation)
const calculatePeakDays = (neighborhood) => {
  const days = ['Weekends', 'Weekdays', 'Friday evenings'];
  return days[neighborhood.name.length % days.length];
};

// Helper function to get top crime categories without exact numbers
const getTopCrimeCategories = (crimeTypes) => {
  const sortedTypes = Object.entries(crimeTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type.replace('.', '').toLowerCase());
  
  return sortedTypes.join(', ');
};

// Helper function to calculate relative risk compared to other areas
const calculateRelativeRisk = (neighborhood, allNeighborhoods) => {
  const totalCrimes = allNeighborhoods.reduce((sum, n) => sum + n.crimeCount, 0);
  const avgCrimes = totalCrimes / allNeighborhoods.length;
  
  if (neighborhood.crimeCount > avgCrimes * 1.5) {
    return 'Higher than average';
  } else if (neighborhood.crimeCount < avgCrimes * 0.7) {
    return 'Lower than average';
  } else {
    return 'Around average';
  }
};

// Helper function for safety recommendations
const getSafetyRecommendations = (crimeLevel) => {
  switch (crimeLevel) {
    case 'high':
      return 'Travel in groups, avoid nighttime';
    case 'medium':
      return 'Stay vigilant, use well-lit routes';
    case 'low':
      return 'Standard safety precautions advised';
    default:
      return 'Exercise normal caution';
  }
};

export default function MapComponent() {
  const center = { lat: -33.9249, lng: 18.4241 };
  const [points, setPoints] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [filteredPoints, setFilteredPoints] = useState([]);
  const [filteredNeighborhoods, setFilteredNeighborhoods] = useState([]);
  const [mapCenter, setMapCenter] = useState(center);
  const [destination, setDestination] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [showCircles, setShowCircles] = useState(true);
  const [selectedCrime, setSelectedCrime] = useState(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [travelMode, setTravelMode] = useState("WALKING");
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [routeSummary, setRouteSummary] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeSafety, setRouteSafety] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [mapKey, setMapKey] = useState(Date.now());
  const [showPredictiveDashboard, setShowPredictiveDashboard] = useState(false);
  const [showCommunities, setShowCommunities] = useState(false);
  
  // User profile states - UPDATED to use localStorage/backend instead of Firebase
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    surname: '',
    cell: '',
    email: '',
    emergencyContacts: [{ name: '', cell: '', email: '' }]
  });
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [trackingLocation, setTrackingLocation] = useState(null);
  const [safetyData, setSafetyData] = useState(null);
  const [trackingSessions, setTrackingSessions] = useState([]);
  const [activeTrackingId, setActiveTrackingId] = useState(null);

  const startAutocompleteRef = useRef(null);
  const destinationAutocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["visualization", "places"],
  });

  // Load user from localStorage (from AuthForm)
  useEffect(() => {
    const loadUserFromStorage = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setUserProfile(userData);
          setProfileForm({
            name: userData.name || '',
            surname: userData.surname || '',
            cell: userData.cell || '',
            email: userData.email || '',
            emergencyContacts: userData.emergencyContacts || [{ name: '', cell: '', email: '' }]
          });
          
          // Check for active tracking session in localStorage
          checkActiveTrackingSession();
        } catch (error) {
          console.error('Error loading user from localStorage:', error);
        }
      }
    };

    loadUserFromStorage();

    // Listen for auth state changes (from login/logout)
    const handleAuthChange = () => {
      loadUserFromStorage();
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
  }, []);

  // Check for active tracking session in localStorage
  const checkActiveTrackingSession = () => {
    const trackingId = localStorage.getItem('activeTrackingId');
    const trackingData = localStorage.getItem('safetyData');
    
    if (trackingId) {
      setActiveTrackingId(trackingId);
      setIsTracking(true);
    }
    
    if (trackingData) {
      try {
        setSafetyData(JSON.parse(trackingData));
      } catch (error) {
        console.error('Error parsing tracking data:', error);
      }
    }
  };

  // Tracking functions (simplified for localStorage)
  const storeTrackingSession = async (location, safetyInfo, action = 'start') => {
    if (!user) {
      throw new Error("User must be logged in to track location");
    }

    try {
      if (action === 'start') {
        const trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const trackingData = {
          id: trackingId,
          userId: user.userId,
          userEmail: user.email,
          safetyData: safetyInfo,
          locations: [{
            lat: location.lat,
            lng: location.lng,
            timestamp: new Date().toISOString(),
            accuracy: location.accuracy || null
          }],
          status: 'active',
          startedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          totalLocations: 1
        };

        // Store in localStorage for now (can be extended to backend later)
        localStorage.setItem('activeTrackingId', trackingId);
        localStorage.setItem('safetyData', JSON.stringify(safetyInfo));
        localStorage.setItem(`tracking_${trackingId}`, JSON.stringify(trackingData));
        
        setActiveTrackingId(trackingId);
        return trackingId;
      } else if (action === 'update' && activeTrackingId) {
        const trackingDataStr = localStorage.getItem(`tracking_${activeTrackingId}`);
        if (trackingDataStr) {
          const trackingData = JSON.parse(trackingDataStr);
          trackingData.locations.push({
            lat: location.lat,
            lng: location.lng,
            timestamp: new Date().toISOString(),
            accuracy: location.accuracy || null
          });
          trackingData.lastUpdated = new Date().toISOString();
          trackingData.totalLocations = trackingData.locations.length;
          
          localStorage.setItem(`tracking_${activeTrackingId}`, JSON.stringify(trackingData));
        }
      } else if (action === 'stop' && activeTrackingId) {
        const trackingDataStr = localStorage.getItem(`tracking_${activeTrackingId}`);
        if (trackingDataStr) {
          const trackingData = JSON.parse(trackingDataStr);
          trackingData.status = 'completed';
          trackingData.endedAt = new Date().toISOString();
          
          localStorage.setItem(`tracking_${activeTrackingId}`, JSON.stringify(trackingData));
        }
        
        localStorage.removeItem('activeTrackingId');
        localStorage.removeItem('safetyData');
        setActiveTrackingId(null);
      }
    } catch (error) {
      console.error("Error storing tracking data:", error);
      throw error;
    }
  };

  const storeEmergencyContactNotification = async (safetyInfo) => {
    if (!user) return;
    
    // For now, just log to console (can be extended to send emails later)
    console.log('Emergency notification would be sent to:', userProfile?.emergencyContacts);
    console.log('Safety info:', safetyInfo);
  };

  const handleSafetyDataUpdate = (safetyInfo) => {
    setSafetyData(safetyInfo);
    // Auto-save to localStorage as backup
    localStorage.setItem('safetyData', JSON.stringify(safetyInfo));
  };

  // Load user's tracking history from localStorage
  const loadTrackingSessions = async () => {
    if (!user) return;
    
    try {
      const sessions = [];
      // Loop through localStorage keys to find tracking sessions for this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('tracking_')) {
          try {
            const session = JSON.parse(localStorage.getItem(key));
            if (session.userId === user.userId) {
              sessions.push(session);
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      }
      // Sort by startedAt descending
      sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      setTrackingSessions(sessions);
    } catch (error) {
      console.error("Error loading tracking sessions:", error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/crimes");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();

        const pts = data.map((c) => ({
          lat: +c.Y,
          lng: +c.X,
          type: c.TYPE,
          neighbourhood: c.NEIGHBOURHOOD,
          date: `${c.YEAR}-${c.MONTH}-${c.DAY}`,
          time: `${c.HOUR}:${c.MINUTE}`,
        }));

        setPoints(pts);
        setFilteredPoints(pts);

        const agg = {};
        pts.forEach((p) => {
          const nb = p.neighbourhood || "Unknown";
          if (!agg[nb]) agg[nb] = { 
            count: 0, 
            types: {}, 
            points: [],
            crimeLevel: 'low'
          };
          agg[nb].count++;
          agg[nb].points.push({ lat: p.lat, lng: p.lng });
          const key = p.type?.trim().toLowerCase() || "unknown";
          agg[nb].types[key] = (agg[nb].types[key] || 0) + 1;
        });

        // Calculate crime level for each neighborhood based on count
        Object.keys(agg).forEach(nb => {
          agg[nb].crimeLevel = getCrimeLevelForRadius(agg[nb].count);
        });

        const nbs = Object.entries(agg).map(([name, data]) => ({
          name,
          crimeCount: data.count,
          crimeTypes: data.types,
          crimeLevel: data.crimeLevel,
          center: {
            lat: data.points.reduce((s, p) => s + p.lat, 0) / data.points.length,
            lng: data.points.reduce((s, p) => s + p.lng, 0) / data.points.length,
          },
        }));

        setNeighborhoods(nbs);
        setFilteredNeighborhoods(nbs);
      } catch (error) {
        console.error("Error fetching crime data:", error);
        alert("Failed to load crime data. Please try again later.");
      }
    })();
  }, []);

  // User profile functions - UPDATED to use localStorage/backend
  const handleLogout = async () => {
    try {
      // Stop tracking before logout
      if (isTracking) {
        await handleStopTracking();
      }
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('obsTempCredentials');
      localStorage.removeItem('activeTrackingId');
      localStorage.removeItem('safetyData');
      
      setUser(null);
      setUserProfile(null);
      
      // Dispatch event for App.jsx
      window.dispatchEvent(new Event('auth-state-changed'));
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleProfileEdit = () => {
    setIsEditing(true);
  };

  const handleProfileCancel = () => {
    setIsEditing(false);
    setProfileForm({
      name: userProfile?.name || '',
      surname: userProfile?.surname || '',
      cell: userProfile?.cell || '',
      email: userProfile?.email || '',
      emergencyContacts: userProfile?.emergencyContacts || [{ name: '', cell: '', email: '' }]
    });
    setProfileError('');
  };

  const handleProfileChange = (e, index = null) => {
    const { name, value } = e.target;
    if (name.startsWith('emergency')) {
      const field = name.split('.')[1];
      const updated = [...profileForm.emergencyContacts];
      updated[index][field] = value;
      setProfileForm({ ...profileForm, emergencyContacts: updated });
    } else {
      setProfileForm({ ...profileForm, [name]: value });
    }
  };

  const addEmergencyContact = () => {
    setProfileForm({
      ...profileForm,
      emergencyContacts: [...profileForm.emergencyContacts, { name: '', cell: '', email: '' }],
    });
  };

  const removeEmergencyContact = (index) => {
    if (profileForm.emergencyContacts.length > 1) {
      const updated = profileForm.emergencyContacts.filter((_, i) => i !== index);
      setProfileForm({ ...profileForm, emergencyContacts: updated });
    }
  };

  const handleProfileSave = async () => {
    if (!user) return;
    
    setProfileLoading(true);
    setProfileError('');

    try {
      // Update localStorage
      const updatedUser = {
        ...user,
        name: profileForm.name,
        surname: profileForm.surname,
        cell: profileForm.cell,
        emergencyContacts: profileForm.emergencyContacts
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setUserProfile(updatedUser);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Enhanced route safety calculation
  const calculateRouteSafety = (route, neighborhoods) => {
    const path = route.overview_path;
    let highRiskCount = 0;    // >270 crimes
    let moderateRiskCount = 0; // 230-270 crimes
    let safeRiskCount = 0;    // <230 crimes
    
    const routePoints = path.map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));
    
    console.log("Calculating safety for route with", routePoints.length, "points");
    
    for (let hotspot of neighborhoods) {
      let isNearHotspot = false;
      
      for (let routePoint of routePoints) {
        const distance = haversine(routePoint, hotspot.center);
        if (distance <= (RADIUS / 1000)) {
          isNearHotspot = true;
          break;
        }
      }
      
      if (isNearHotspot) {
        console.log(`Route passes through ${hotspot.name} (${hotspot.crimeLevel} risk, ${hotspot.crimeCount} crimes)`);
        
        switch (hotspot.crimeLevel) {
          case 'high':
            highRiskCount++;
            break;
          case 'medium':
            moderateRiskCount++;
            break;
          case 'low':
            safeRiskCount++;
            break;
        }
      }
    }
    
    const crimeRiskScore = (highRiskCount * 10) + (moderateRiskCount * 5) + (safeRiskCount * 1);
    const totalRiskScore = crimeRiskScore;
    
    console.log(`Risk scores - Crime: ${crimeRiskScore}, Total: ${totalRiskScore}`);
    
    if (highRiskCount === 0 && moderateRiskCount === 0) {
      return { 
        level: "safe", 
        highRiskCount, 
        moderateRiskCount, 
        safeRiskCount,
        totalRiskScore 
      };
    } else if (highRiskCount === 0 && moderateRiskCount > 0) {
      return { 
        level: "moderate", 
        highRiskCount, 
        moderateRiskCount, 
        safeRiskCount,
        totalRiskScore 
      };
    } else {
      return { 
        level: "risky", 
        highRiskCount, 
        moderateRiskCount, 
        safeRiskCount,
        totalRiskScore 
      };
    }
  };

  const findSafestRoute = (routes, neighborhoods) => {
    if (routes.length === 0) return { route: null, safety: null };
    
    let safestRoute = routes[0];
    let safestSafety = calculateRouteSafety(routes[0], neighborhoods);
    let minRiskScore = safestSafety.totalRiskScore;
    
    for (let i = 1; i < routes.length; i++) {
      const safety = calculateRouteSafety(routes[i], neighborhoods);
      const riskScore = safety.totalRiskScore;
      
      if (riskScore < minRiskScore) {
        minRiskScore = riskScore;
        safestRoute = routes[i];
        safestSafety = safety;
      }
    }
    
    return { route: safestRoute, safety: safestSafety };
  };

  const getSafetyMessage = (safety) => {
    if (!safety) return "";
    
    let message = "";
    const crimeParts = [];
    
    if (safety.highRiskCount > 0) {
      crimeParts.push(`${safety.highRiskCount} high-risk crime area${safety.highRiskCount !== 1 ? 's' : ''}`);
    }
    if (safety.moderateRiskCount > 0) {
      crimeParts.push(`${safety.moderateRiskCount} moderate-risk crime area${safety.moderateRiskCount !== 1 ? 's' : ''}`);
    }
    if (safety.safeRiskCount > 0) {
      crimeParts.push(`${safety.safeRiskCount} safe crime area${safety.safeRiskCount !== 1 ? 's' : ''}`);
    }
    
    const hasHighRiskCrime = safety.highRiskCount > 0;
    const hasModerateRiskCrime = safety.moderateRiskCount > 0;
    const hasOnlySafeAreas = safety.highRiskCount === 0 && safety.moderateRiskCount === 0;
    
    if (hasHighRiskCrime) {
      message = `🚨 HIGH RISK - Route passes through ${safety.highRiskCount} high-crime area${safety.highRiskCount !== 1 ? 's' : ''}. Avoid this route if possible or ensure extra safety precautions.`;
    } else if (hasModerateRiskCrime) {
      message = `⚠️ MODERATE RISK - Route passes through ${safety.moderateRiskCount} moderate-crime area${safety.moderateRiskCount !== 1 ? 's' : ''}. Remain vigilant during your journey.`;
    } else if (hasOnlySafeAreas) {
      if (safety.safeRiskCount > 0) {
        message = `✅ SAFE ROUTE - Passes through ${safety.safeRiskCount} low-crime area${safety.safeRiskCount !== 1 ? 's' : ''}. This is your safest option.`;
      } else {
        message = `✅ EXCELLENT ROUTE - No crime hotspots detected along this path.`;
      }
    } else {
      if (crimeParts.length > 0) {
        message = `Route assessment: Passes through ${crimeParts.join(', ')}.`;
      } else {
        message = "Route safety assessment unavailable.";
      }
    }
    
    message += ` [High-risk crimes: ${safety.highRiskCount}, Moderate: ${safety.moderateRiskCount}, Safe: ${safety.safeRiskCount}]`;
    
    return message;
  };

  const getSafetyIcon = (level) => {
    switch (level) {
      case "safe": return "🟢";
      case "moderate": return "🟡";
      case "risky": return "🔴";
      default: return "⚪";
    }
  };

  const getRouteColor = (safetyLevel) => {
    switch (safetyLevel) {
      case "safe": 
        return "#00FF00";
      case "moderate": 
        return "#FFFF00";
      case "risky": 
        return "#FF0000";
      default: 
        return "#FF69B4";
    }
  };

  const getCrimeHotspotOpacity = () => {
    return directionsResponse ? 0.05 : 0.15;
  };

  const getCrimeHotspotStrokeOpacity = () => {
    return directionsResponse ? 0.3 : 0.8;
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        
        setCurrentLocation(location);
        setMapCenter(location);
        setUseCurrentLocation(true);
        setIsLocating(false);
        
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your current location. Please check your browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      if (!window.google || !window.google.maps) {
        console.error("Google Maps API not loaded");
        return;
      }
      
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK") {
          if (results[0]) {
            setStartLocation(results[0].formatted_address);
          }
        } else {
          console.error("Geocoder failed due to: " + status);
        }
      });
    } catch (error) {
      console.error("Reverse geocode error:", error);
    }
  };

  const onStartLoad = (autocomplete) => {
    startAutocompleteRef.current = autocomplete;
  };

  const onDestinationLoad = (autocomplete) => {
    destinationAutocompleteRef.current = autocomplete;
  };

  const onStartPlaceChanged = () => {
    if (startAutocompleteRef.current) {
      const place = startAutocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        setStartLocation(place.formatted_address);
        setUseCurrentLocation(false);
      }
    }
  };

  const onDestinationPlaceChanged = () => {
    if (destinationAutocompleteRef.current) {
      const place = destinationAutocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        setDestination(place.formatted_address);
      }
    }
  };

  const onMapLoad = (map) => {
    mapRef.current = map;
  };

  const getNeighborhoodColor = (crimeCount) => {
    if (crimeCount < 230) return "#00FF00";
    if (crimeCount <= 270) return "#FFFF00";
    return "#FF0000";
  };

  const requestDirections = (origin, dest) => {
    setIsCalculatingRoute(true);
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      {
        origin,
        destination: dest,
        travelMode: travelMode,
        provideRouteAlternatives: true,
      },
      (res, status) => {
        if (status === "OK") {
          console.log("Found", res.routes.length, "route alternatives");
          
          const { route, safety } = findSafestRoute(res.routes, neighborhoods);
          setDirectionsResponse({ routes: [route] });
          setRouteSafety(safety);
          setShowDirectionsPanel(true);
          
          const leg = route.legs[0];
          setRouteSummary({
            distance: leg.distance.text,
            duration: leg.duration.text,
            startAddress: leg.start_address,
            endAddress: leg.end_address,
            steps: leg.steps
          });

          const path = route.overview_path.map(point => ({
            lat: point.lat(),
            lng: point.lng()
          }));
          setRoutePath(path);

          const googlePath = route.overview_path;

          setFilteredPoints(
            points.filter((p) =>
              googlePath.some((pt) => haversine({ lat: p.lat, lng: p.lng }, { lat: pt.lat(), lng: pt.lng() }) <= MAX_DIST_KM)
            )
          );

          setFilteredNeighborhoods(
            neighborhoods.filter((n) =>
              googlePath.some((pt) => haversine(n.center, { lat: pt.lat(), lng: pt.lng() }) <= MAX_DIST_KM)
            )
          );
          
          const bounds = new window.google.maps.LatLngBounds();
          googlePath.forEach(point => bounds.extend(point));
          mapRef.current.fitBounds(bounds);
        } else {
          console.error("Directions request failed:", status);
          alert("Could not find directions. Please check addresses!");
        }
        setIsCalculatingRoute(false);
      }
    );
  };

  const handleGetDirections = async () => {
    if (!destination) {
      alert("Please enter a destination");
      return;
    }
    
    let destCoords;
    
    if (destinationAutocompleteRef.current) {
      const place = destinationAutocompleteRef.current.getPlace();
      if (place && place.geometry && place.geometry.location) {
        destCoords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
      }
    }
    
    if (!destCoords) {
      try {
        const geocodeRes = await fetch(
          `http://localhost:5000/api/geocode?address=${encodeURIComponent(destination)}`
        );
        if (!geocodeRes.ok) throw new Error("Geocoding failed");
        
        const geoData = await geocodeRes.json();
        if (geoData?.lat && geoData?.lng) {
          destCoords = { lat: geoData.lat, lng: geoData.lng };
        } else {
          throw new Error("Invalid geocoding response");
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        alert("Could not find the destination. Please check the address.");
        return;
      }
    }
    
    setDestinationCoords(destCoords);
    setMapCenter(destCoords);

    if (useCurrentLocation && currentLocation) {
      requestDirections(currentLocation, destCoords);
    } else if (startLocation) {
      let startCoords = startLocation;
      if (startAutocompleteRef.current) {
        const place = startAutocompleteRef.current.getPlace();
        if (place && place.geometry && place.geometry.location) {
          startCoords = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          };
        }
      }
      requestDirections(startCoords, destCoords);
    } else {
      alert("Please enter a starting location or use your current location");
    }
  };

  const clearDirections = () => {
    setDirectionsResponse(null);
    setShowDirectionsPanel(false);
    setRouteSummary(null);
    setRouteSafety(null);
    setRoutePath([]);
    setFilteredPoints(points);
    setFilteredNeighborhoods(neighborhoods);
    setDestinationCoords(null);
    setDestination("");
    setStartLocation("");
    setUseCurrentLocation(false);
    
    if (startAutocompleteRef.current) startAutocompleteRef.current.set("");
    if (destinationAutocompleteRef.current) destinationAutocompleteRef.current.set("");
    
    setMapCenter(center);
    if (mapRef.current) {
      mapRef.current.setZoom(10);
      mapRef.current.setCenter(center);
    }
    setMapKey(Date.now());
  };

  const getTravelModeIcon = (mode) => {
    switch (mode) {
      case "WALKING": return "🚶";
      case "DRIVING": return "🚗";
      case "CYCLING": return "🚴";
      case "TRANSIT": return "🚆";
      default: return "🚶";
    }
  };

  // Add handleStopTracking function
  const handleStopTracking = async () => {
    if (!activeTrackingId) return;
    
    try {
      await storeTrackingSession(trackingLocation, safetyData, 'stop');
      setIsTracking(false);
      setTrackingLocation(null);
      alert('Tracking stopped');
    } catch (error) {
      console.error('Error stopping tracking:', error);
      alert('Failed to stop tracking');
    }
  };

  if (!isLoaded) return <div className="map-container--loading">Loading Map...</div>;

  return (
    <div className="map-wrapper">
      {/* User Profile Button - Updated to show user name from localStorage */}
      <div className="user-profile-button">
        <button 
          className="profile-btn"
          onClick={() => setShowProfileModal(true)}
          title="View Profile"
        >
          👤 {userProfile?.name || user?.name || 'Profile'}
        </button>
      </div>

      {/* Predictive Dashboard */}
      {showPredictiveDashboard && (
        <div className="predictive-dashboard-container">
          <PredictiveDashboard 
            onClose={() => setShowPredictiveDashboard(false)}
            crimeData={points}
            neighborhoods={neighborhoods}
            currentRoute={routePath}
            routeSafety={routeSafety}
            currentLocation={currentLocation}
            trackingData={safetyData}
          />
        </div>
      )}

      {/* Communities Dashboard */}
      {showCommunities && (
        <div className="communities-container">
          <Communities 
            onClose={() => setShowCommunities(false)}
            neighborhoods={neighborhoods}
            crimeData={points}
            currentLocation={currentLocation}
          />
        </div>
      )}

      <GoogleMap
        key={`${showCircles ? "circles" : "pins"}-${mapKey}`}
        mapContainerClassName="map-container"
        center={mapCenter}
        zoom={13}
        options={{
          styles: [
            {
              featureType: "all",
              elementType: "labels.icon",
              stylers: [{ visibility: "on" }],
            },
          ],
        }}
        onLoad={onMapLoad}
      >
        {showCircles &&
          filteredNeighborhoods.map((n) => (
            <Circle
              key={n.name}
              center={n.center}
              radius={RADIUS}
              options={{
                fillColor: getNeighborhoodColor(n.crimeCount),
                fillOpacity: getCrimeHotspotOpacity(),
                strokeOpacity: getCrimeHotspotStrokeOpacity(),
                strokeWeight: 2,
                strokeColor: getNeighborhoodColor(n.crimeCount),
              }}
              onClick={() => setSelectedNeighborhood(n)}
            />
          ))}

        {!showCircles &&
          filteredPoints.map((crime, idx) => (
            <Marker
              key={idx}
              position={{ lat: crime.lat, lng: crime.lng }}
              icon={{
                url: `http://maps.google.com/mapfiles/ms/icons/${getMarkerColor(crime.type)}-dot.png`,
              }}
              onClick={() => setSelectedCrime(crime)}
            />
          ))}

        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            }}
            zIndex={1000}
          />
        )}

        {destinationCoords && (
          <Marker
            position={destinationCoords}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            }}
            zIndex={1000}
          />
        )}

        {/* Tracking Location Marker */}
        {trackingLocation && (
          <Marker
            position={trackingLocation}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
              scaledSize: new window.google.maps.Size(32, 32),
            }}
            zIndex={1001}
            title={`Tracking: ${safetyData?.destination || 'Active tracking'}`}
          />
        )}

        {selectedCrime && !showCircles && (
          <InfoWindow
            position={{ lat: selectedCrime.lat, lng: selectedCrime.lng }}
            onCloseClick={() => setSelectedCrime(null)}
            options={{
              pixelOffset: new window.google.maps.Size(0, -30),
            }}
          >
            <div className="map-infowindow">
              <h4 className="map-infowindow__crime">{selectedCrime.type}</h4>
              <p><strong>Neighbourhood:</strong> {selectedCrime.neighbourhood}</p>
              <p><strong>Date:</strong> {selectedCrime.date}</p>
              <p><strong>Time:</strong> {selectedCrime.time}</p>
            </div>
          </InfoWindow>
        )}

        {selectedNeighborhood && showCircles && (
          <InfoWindow 
            position={selectedNeighborhood.center} 
            onCloseClick={() => setSelectedNeighborhood(null)}
            options={{
              pixelOffset: new window.google.maps.Size(0, -30),
            }}
          >
            <div className="modern-info-window">
              <div className="info-window-header">
                <div className="neighborhood-title">
                  <h3>{selectedNeighborhood.name}</h3>
                  <div className={`safety-badge safety-${selectedNeighborhood.crimeLevel}`}>
                    {selectedNeighborhood.crimeLevel === 'high' ? '🚨 High Risk' : 
                     selectedNeighborhood.crimeLevel === 'medium' ? '⚠️ Moderate Risk' : 
                     '✅ Generally Safe'}
                  </div>
                </div>
              </div>

              <div className="safety-score-section">
                <div className="safety-meter">
                  <div className="safety-labels">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                  <div className="meter-bar">
                    <div 
                      className={`meter-fill meter-${selectedNeighborhood.crimeLevel}`}
                      style={{
                        width: selectedNeighborhood.crimeLevel === 'high' ? '100%' : 
                               selectedNeighborhood.crimeLevel === 'medium' ? '66%' : '33%'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🕒</div>
                  <div className="stat-content">
                    <span className="stat-label">Peak Hours</span>
                    <span className="stat-value">{calculatePeakHours(selectedNeighborhood)}</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <span className="stat-label">Active Days</span>
                    <span className="stat-value">{calculatePeakDays(selectedNeighborhood)}</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <span className="stat-label">Risk Level</span>
                    <span className="stat-value">{calculateRelativeRisk(selectedNeighborhood, neighborhoods)}</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">🔍</div>
                  <div className="stat-content">
                    <span className="stat-label">Common Types</span>
                    <span className="stat-value">{getTopCrimeCategories(selectedNeighborhood.crimeTypes)}</span>
                  </div>
                </div>
              </div>

              <div className="recommendations-section">
                <div className="recommendations-header">
                  <span className="recommendations-icon">💡</span>
                  <h4>Safety Tips</h4>
                </div>
                <p className="recommendations-text">
                  {getSafetyRecommendations(selectedNeighborhood.crimeLevel)}
                </p>
              </div>

              <div className="action-buttons">
                <button className="action-btn action-btn--primary">
                  🗺️ Plan Route
                </button>
                <button className="action-btn action-btn--secondary">
                  📋 More Details
                </button>
              </div>
            </div>
          </InfoWindow>
        )}

        {directionsResponse && routeSafety && (
          <DirectionsRenderer
            directions={directionsResponse}
            options={{
              polylineOptions: {
                strokeColor: getRouteColor(routeSafety.level),
                strokeWeight: 6,
                strokeOpacity: 0.9,
                zIndex: 1000,
              },
              preserveViewport: false,
            }}
          />
        )}

        {routePath.length > 0 && directionsResponse && routeSafety && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: getRouteColor(routeSafety.level),
              strokeWeight: 8,
              strokeOpacity: 0.9,
              zIndex: 1000,
              clickable: false
            }}
          />
        )}
      </GoogleMap>

      <div className="map-controls">
        <div className="destination-card">
          <h3 className="destination-card__title">Plan Your Route</h3>
          
          <div className="destination-card__input-group">
            <label className="destination-card__label">Starting Location</label>
            <Autocomplete
              onLoad={onStartLoad}
              onPlaceChanged={onStartPlaceChanged}
            >
              <input
                type="text"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="Enter starting location..."
                className="destination-card__input"
              />
            </Autocomplete>
          </div>

          <button 
            className={`destination-card__current-location ${useCurrentLocation ? 'active' : ''}`}
            onClick={getCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <>
                <div className="destination-card__spinner"></div>
                Locating...
              </>
            ) : (
              <>
                <svg className="destination-card__location-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM20.94 11C20.48 6.83 17.17 3.52 13 3.06V1H11V3.06C6.83 3.52 3.52 6.83 3.06 11H1V13H3.06C3.52 17.17 6.83 20.48 11 20.94V23H13V20.94C17.17 20.48 20.48 17.17 20.94 13H23V11H20.94ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19Z" fill="currentColor"/>
                </svg>
                {useCurrentLocation ? "Using Current Location" : "Use My Current Location"}
              </>
            )}
          </button>

          <div className="destination-card__input-group">
            <label className="destination-card__label">Destination</label>
            <Autocomplete
              onLoad={onDestinationLoad}
              onPlaceChanged={onDestinationPlaceChanged}
            >
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination..."
                className="destination-card__input"
              />
            </Autocomplete>
          </div>

          <div className="destination-card__travel-modes">
            <label className="destination-card__label">Travel Mode</label>
            <div className="destination-card__mode-buttons">
              {["WALKING", "DRIVING", "CYCLING", "TRANSIT"].map(mode => (
                <button
                  key={mode}
                  className={`destination-card__mode-button ${travelMode === mode ? 'active' : ''}`}
                  onClick={() => setTravelMode(mode)}
                >
                  {getTravelModeIcon(mode)} {mode.charAt(0) + mode.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="destination-card__options">
            <div className="destination-card__toggle-group">
              <span className="destination-card__toggle-label">Show crime hotspots</span>
              <label className="destination-card__switch">
                <input
                  type="checkbox"
                  checked={showCircles}
                  onChange={() => setShowCircles((s) => !s)}
                />
                <span className="destination-card__slider"></span>
              </label>
            </div>
          </div>

          <button 
            onClick={handleGetDirections} 
            className="destination-card__button"
            disabled={isCalculatingRoute}
          >
            {isCalculatingRoute ? (
              <>
                <div className="destination-card__spinner"></div>
                Calculating...
              </>
            ) : (
              <>
                Safe Route
                <svg className="destination-card__button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>

          <button 
            onClick={() => setShowPredictiveDashboard(true)}
            className="destination-card__button destination-card__button--analysis"
          >
            📊 Safety Forecast
          </button>

          <button 
            onClick={() => setShowCommunities(true)}
            className="destination-card__button destination-card__button--communities"
          >
            🏘️ Community
          </button>

          {directionsResponse && (
            <button onClick={clearDirections} className="destination-card__button destination-card__button--secondary">
              Clear Directions
            </button>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal">
            <div className="profile-modal-header">
              <h3>User Profile</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowProfileModal(false);
                  setIsEditing(false);
                  setProfileError('');
                }}
              >
                ×
              </button>
            </div>

            <div className="profile-content">
              {!isEditing ? (
                // View Mode
                <div className="profile-view">
                  <div className="profile-info">
                    <div className="info-item">
                      <label>Name:</label>
                      <span>{userProfile?.name} {userProfile?.surname}</span>
                    </div>
                    <div className="info-item">
                      <label>Email:</label>
                      <span>{userProfile?.email}</span>
                    </div>
                    <div className="info-item">
                      <label>Cell:</label>
                      <span>{userProfile?.cell}</span>
                    </div>
                  </div>

                  <div className="emergency-contacts">
                    <h4>Emergency Contacts</h4>
                    {userProfile?.emergencyContacts?.map((contact, index) => (
                      <div key={index} className="contact-item">
                        <p><strong>{contact.name}</strong></p>
                        <p>Cell: {contact.cell}</p>
                        <p>Email: {contact.email}</p>
                      </div>
                    ))}
                  </div>

                  <div className="profile-actions">
                    <button className="edit-btn" onClick={handleProfileEdit}>
                      Edit Profile
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="profile-edit">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="surname"
                      value={profileForm.surname}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cell Number</label>
                    <input
                      type="text"
                      name="cell"
                      value={profileForm.cell}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      disabled
                    />
                  </div>

                  <div className="emergency-contacts-edit">
                    <h4>Emergency Contacts</h4>
                    {profileForm.emergencyContacts.map((contact, index) => (
                      <div key={index} className="contact-edit">
                        <div className="form-group">
                          <label>Contact Name</label>
                          <input
                            type="text"
                            name="emergency.name"
                            value={contact.name}
                            onChange={(e) => handleProfileChange(e, index)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Contact Cell</label>
                          <input
                            type="text"
                            name="emergency.cell"
                            value={contact.cell}
                            onChange={(e) => handleProfileChange(e, index)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Contact Email</label>
                          <input
                            type="email"
                            name="emergency.email"
                            value={contact.email}
                            onChange={(e) => handleProfileChange(e, index)}
                          />
                        </div>
                        {profileForm.emergencyContacts.length > 1 && (
                          <button
                            type="button"
                            className="remove-contact-btn"
                            onClick={() => removeEmergencyContact(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="add-contact-btn"
                      onClick={addEmergencyContact}
                    >
                      + Add Emergency Contact
                    </button>
                  </div>

                  {profileError && <div className="error-message">{profileError}</div>}

                  <div className="edit-actions">
                    <button 
                      className="save-btn" 
                      onClick={handleProfileSave}
                      disabled={profileLoading}
                    >
                      {profileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button className="cancel-btn" onClick={handleProfileCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDirectionsPanel && routeSummary && routeSafety && (
        <div className="directions-panel">
          <div className="directions-panel__header">
            <h3>Directions</h3>
            <button className="directions-panel__close" onClick={() => setShowDirectionsPanel(false)}>
              ×
            </button>
          </div>
          <div className="directions-panel__summary">
            <div className="directions-panel__route-info">
              <div className="directions-panel__info-item">
                <span className="directions-panel__label">Route Safety:</span>
                <span className="directions-panel__value" style={{ 
                  color: routeSafety.level === "safe" ? "#00FF00" : 
                         routeSafety.level === "moderate" ? "#FFFF00" : "#FF0000",
                  fontWeight: 'bold'
                }}>
                  {getSafetyIcon(routeSafety.level)} {getSafetyMessage(routeSafety)}
                </span>
              </div>
              <div className="directions-panel__info-item">
                <span className="directions-panel__label">From:</span>
                <span className="directions-panel__value">{routeSummary.startAddress}</span>
              </div>
              <div className="directions-panel__info-item">
                <span className="directions-panel__label">To:</span>
                <span className="directions-panel__value">{routeSummary.endAddress}</span>
              </div>
              <div className="directions-panel__info-item">
                <span className="directions-panel__label">Distance:</span>
                <span className="directions-panel__value">{routeSummary.distance}</span>
              </div>
              <div className="directions-panel__info-item">
                <span className="directions-panel__label">Duration:</span>
                <span className="directions-panel__value">{routeSummary.duration}</span>
              </div>
            </div>
            <button 
              onClick={clearDirections}
              className="directions-panel__clear-button"
            >
              Clear Route
            </button>
          </div>
          <div className="directions-panel__steps">
            <h4>Turn-by-turn directions:</h4>
            <ol className="directions-panel__steps-list">
              {routeSummary.steps.map((step, index) => (
                <li key={index} className="directions-panel__step">
                  <div dangerouslySetInnerHTML={{ __html: step.instructions }} />
                  <span className="directions-panel__step-distance">{step.distance.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <Chatbot
        mapCenter={selectedNeighborhood ? selectedNeighborhood.center : mapCenter}
        crimeCount={selectedNeighborhood ? selectedNeighborhood.crimeCount : null}
      />

      <Dictionary className="map-dictionary" />
    </div>
  );
}