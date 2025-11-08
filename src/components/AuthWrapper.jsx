import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AuthWrapper({ children }) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      
      if (user) {
        // Only redirect to /map if we're NOT already on /map or other protected routes
        if (location.pathname === '/') {
          navigate('/map');
        }
        // If user is on /map or other protected routes, do nothing
      } else {
        // User is not authenticated, redirect to sign-in
        if (location.pathname !== '/') {
          navigate('/');
        }
      }
    });
    
    return () => unsubscribe();
  }, [navigate, location.pathname]);

  return loading ? <p>Loading...</p> : children;
}