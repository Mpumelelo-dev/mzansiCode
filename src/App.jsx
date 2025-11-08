import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from './firebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        {/* Only show NavBar when user is authenticated AND not on auth page */}
        {user && <NavBar />}
        
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
                user ? <MapComponent /> : <Navigate to="/" replace />
              } 
            />
            
            {/* Protect home route as well */}
            <Route 
              path="/home" 
              element={
                user ? <Home /> : <Navigate to="/" replace />
              } 
            />
            
            {/* Add SafetyDashboard route */}
            <Route 
              path="/dashboard" 
              element={
                user ? <SafetyDashboard /> : <Navigate to="/" replace />
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