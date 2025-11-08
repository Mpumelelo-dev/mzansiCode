// firebaseTracking.js
import { db } from './firebaseConfig';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export const getUserTrackingSessions = async (userId) => {
  try {
    const trackingRef = collection(db, 'trackingSessions');
    const q = query(
      trackingRef,
      where('userId', '==', userId),
      orderBy('startedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching tracking sessions:", error);
    throw error;
  }
};

export const getActiveTrackingSession = async (userId) => {
  try {
    const trackingRef = collection(db, 'trackingSessions');
    const q = query(
      trackingRef,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('startedAt', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching active tracking session:", error);
    throw error;
  }
};

export const sendEmergencyAlert = async (trackingSessionId, emergencyType = 'manual') => {
  try {
    const sessionRef = doc(db, 'trackingSessions', trackingSessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (sessionDoc.exists()) {
      const sessionData = sessionDoc.data();
      
      const emergencyRef = collection(db, 'emergencyAlerts');
      await addDoc(emergencyRef, {
        trackingSessionId,
        userId: sessionData.userId,
        userEmail: sessionData.userEmail,
        safetyData: sessionData.safetyData,
        lastKnownLocation: sessionData.locations[sessionData.locations.length - 1],
        emergencyType,
        timestamp: serverTimestamp(),
        status: 'active'
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error sending emergency alert:", error);
    throw error;
  }
};