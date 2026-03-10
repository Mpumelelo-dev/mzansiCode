import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import AuthForm from './components/AuthForm';
import MapComponent from './components/MapComponent/MapComponent';
import NavBar from './components/NavBar/NavBar';
import Home from './pages/home/home';
import SafetyDashboard from './components/SafetyDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing user session in localStorage
  useEffect(() => {
    const checkUserSession = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('userId');
          localStorage.removeItem('obsTempCredentials');
        }
      }
      setLoading(false);
    };

    // Check on initial load
    checkUserSession();

    // Listen for auth state changes (from login/logout)
    const handleAuthChange = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    
    // Also listen for storage events (for multi-tab support)
    window.addEventListener('storage', (e) => {
      if (e.key === 'user') {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // Handle logout function (can be passed to NavBar if needed)
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('obsTempCredentials');
    setUser(null);
    window.dispatchEvent(new Event('auth-state-changed'));
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{ 
          padding: '20px', 
          background: 'white', 
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          Loading SafeMzansi...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {/* Only show NavBar when user is authenticated */}
        {user && <NavBar onLogout={handleLogout} />}
        
        <main className={`main-content ${user ? 'authenticated' : 'auth-page'}`}>
          <Routes>
            {/* Redirect authenticated users away from login page */}
            <Route 
              path="/" 
              element={
                user ? <Navigate to="/map" replace /> : <AuthForm />
              } 
            />
            
            {/* Protect map route - redirect to login if not authenticated */}
            <Route 
              path="/map" 
              element={
                user ? <MapComponent user={user} /> : <Navigate to="/" replace />
              } 
            />
            
            {/* Protect home route */}
            <Route 
              path="/home" 
              element={
                user ? <Home user={user} /> : <Navigate to="/" replace />
              } 
            />
            
            {/* Protect SafetyDashboard route */}
            <Route 
              path="/dashboard" 
              element={
                user ? <SafetyDashboard user={user} /> : <Navigate to="/" replace />
              } 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to={user ? "/map" : "/"} replace />} />
          </Routes>
        </main>
        
        {/* Vercel Analytics */}
        <Analytics />
      </div>
    </Router>
  );
}

export default App;