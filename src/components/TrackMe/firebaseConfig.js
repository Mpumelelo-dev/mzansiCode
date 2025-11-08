import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  addDoc, 
  collection,
  serverTimestamp 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from "firebase/storage";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCKAE1MrWReMold-90pTonx4hxt1yKUbSY",
  authDomain: "zakaconnect-c7e02.firebaseapp.com",
  projectId: "zakaconnect-c7e02",
  storageBucket: "zakaconnect-c7e02.firebasestorage.app",
  messagingSenderId: "285522125665",
  appId: "1:285522125665:web:b2cab448412e62bbd69b20",
  measurementId: "G-VTRTZHQTKM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ----------------------
// 1. Users - Enhanced with better error handling
// ----------------------
export async function registerUser(email, password, fullName, phoneNumber, medicalConditions = null) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: fullName
    });

    await setDoc(doc(db, "users", user.uid), {
      full_name: fullName,
      email: user.email,
      phone_number: phoneNumber,
      medical_conditions: medicalConditions,
      trigger_emergency: 0,
      overdue_minutes: 0,
      status: "active",
      created_at: serverTimestamp()
    });

    return user.uid;
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

// Upload profile image with error handling
export async function uploadUserImage(userId, file) {
  if (!file) return null;
  
  try {
    // Create unique filename to avoid conflicts
    const fileExtension = file.name.split('.').pop();
    const fileName = `profile_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `users/${userId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error("Failed to upload profile image");
  }
}

// ----------------------
// 2. Emergency Contacts
// ----------------------
export async function addEmergencyContact(userId, name, relationship, phone, email = null) {
  try {
    await addDoc(collection(db, "users", userId, "emergencyContacts"), {
      name,
      relationship,
      phone_number: phone,
      email,
      created_at: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding emergency contact:", error);
    throw new Error("Failed to add emergency contact");
  }
}

// ----------------------
// 3. Trips
// ----------------------
export async function addTrip(userId, trip) {
  try {
    await addDoc(collection(db, "users", userId, "trips"), {
      notes: trip.notes,
      transportation: trip.transportation,
      duration: trip.duration,
      company: trip.company,
      license_plate: trip.license_plate,
      image_upload: trip.image_upload || null,
      trip_date: trip.trip_date || serverTimestamp(),
      start_time: trip.start_time,
      end_time: trip.end_time,
      created_at: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding trip:", error);
    throw new Error("Failed to add trip");
  }
}

// ----------------------
// 4. Escalations
// ----------------------
export async function createEscalation(userId, description) {
  try {
    await addDoc(collection(db, "escalations"), {
      user_id: userId,
      report_date: serverTimestamp(),
      description,
      status: "pending"
    });
  } catch (error) {
    console.error("Error creating escalation:", error);
    throw new Error("Failed to create escalation");
  }
}

// ----------------------
// 5. Admins - Fixed security issue (don't store passwords in plain text)
// ----------------------
export async function createAdmin(adminId, username, password) {
  try {
    // Note: In a real application, admin authentication should be handled differently
    // This is just for demonstration - consider using Firebase Admin SDK on a server
    await setDoc(doc(db, "admins", adminId), {
      username,
      created_at: serverTimestamp(),
      role: "admin"
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    throw new Error("Failed to create admin account");
  }
}

// ----------------------
// 6. Location Tracking
// ----------------------
export async function updateLocationTracking(userId, data) {
  try {
    await addDoc(collection(db, "users", userId, "locationTracking"), {
      safety_toggle: data.safety_toggle || false,
      audio_monitoring: data.audio_monitoring || false,
      location: data.location || false,
      destination: data.destination || "",
      is_active: true,
      updated_at: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating location tracking:", error);
    throw new Error("Failed to update location tracking");
  }
}

// ----------------------
// 7. Password Reset
// ----------------------
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

// ----------------------
// Utility Functions
// ----------------------
function getAuthErrorMessage(errorCode) {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
    'auth/weak-password': 'Password is too weak.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.'
  };
  
  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}

// Export additional utilities
export { serverTimestamp, doc, setDoc };