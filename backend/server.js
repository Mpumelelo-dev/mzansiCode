import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";
import utm from 'utm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import bcrypt from 'bcrypt';

const require = createRequire(import.meta.url);

// Try to load OBS SDK but don't fail if not available
let ObsClient = null;
try {
  ObsClient = require('esdk-obs-nodejs');
  console.log('📦 OBS SDK loaded successfully');
} catch (e) {
  console.log('📦 OBS SDK not available, using memory-only mode');
}

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// ===== DEBUG CODE =====
console.log('\n🔍 ENVIRONMENT VARIABLES DEBUG:');
console.log('  📁 Current directory:', __dirname);
console.log('  📄 .env file path:', path.join(__dirname, '.env'));
console.log('  🔑 HW_ACCESS_KEY exists:', !!process.env.HW_ACCESS_KEY);
console.log('  🔑 HW_SECRET_KEY exists:', !!process.env.HW_SECRET_KEY);
console.log('  🌍 HW_OBS_REGION:', process.env.HW_OBS_REGION || 'not set');
console.log('  📦 HW_OBS_BUCKET:', process.env.HW_OBS_BUCKET || 'not set');
console.log('  🔗 IAM_ENDPOINT:', process.env.IAM_ENDPOINT || 'not set');
console.log('  👤 HW_ACCOUNT_NAME:', process.env.HW_ACCOUNT_NAME || 'not set');
console.log('  👤 HW_IAM_USERNAME:', process.env.HW_IAM_USERNAME || 'not set');
console.log('  🤖 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('  🗺️ GOOGLE_MAPS_API_KEY exists:', !!process.env.GOOGLE_MAPS_API_KEY);
console.log('================================\n');
// ===== END DEBUG CODE =====

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Load crime data safely
const crimeDataPath = path.resolve('src/assets/data/filtered2010-2025.json');
let crimes = [];
try {
  crimes = JSON.parse(fs.readFileSync(crimeDataPath, 'utf-8'));
  console.log(`✅ Loaded ${crimes.length} crime records`);
} catch (error) {
  console.error('❌ Failed to load crime data:', error.message);
  crimes = [];
}

// Gemini setup
let ai = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log('✅ Gemini AI initialized');
} catch (error) {
  console.error('❌ Failed to initialize Gemini:', error.message);
}

// ============================================
// PERSISTENT USER STORAGE
// ============================================

// In-memory user storage (will be persistent once we add file/DB storage)
// For now, this will persist as long as the server runs
const users = [];

// File-based persistence (optional - uncomment to save users to a JSON file)
const USERS_FILE = path.join(__dirname, 'users.json');

// Load users from file if it exists
try {
  if (fs.existsSync(USERS_FILE)) {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    const loadedUsers = JSON.parse(data);
    users.push(...loadedUsers);
    console.log(`✅ Loaded ${loadedUsers.length} users from ${USERS_FILE}`);
  }
} catch (error) {
  console.error('❌ Failed to load users from file:', error.message);
}

// Save users to file (optional)
const saveUsersToFile = () => {
  try {
    // Don't save passwords in plain text - remove them for file storage
    const usersToSave = users.map(({ password, ...user }) => user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersToSave, null, 2));
    console.log(`✅ Saved ${users.length} users to ${USERS_FILE}`);
  } catch (error) {
    console.error('❌ Failed to save users to file:', error.message);
  }
};

// ============================================
// HUAWEI CLOUD OBS CONFIGURATION
// ============================================

// Initialize OBS client for backend operations
let obsClient = null;
if (ObsClient && process.env.HW_ACCESS_KEY && process.env.HW_SECRET_KEY) {
  try {
    const endpoint = process.env.HW_OBS_ENDPOINT ? process.env.HW_OBS_ENDPOINT.replace('https://', '') : 'obs.af-south-1.myhuaweicloud.com';
    
    obsClient = new ObsClient({
      access_key_id: process.env.HW_ACCESS_KEY,
      secret_access_key: process.env.HW_SECRET_KEY,
      server: endpoint,
      timeout: 30000
    });
    
    console.log('✅ OBS Client initialized successfully');
  } catch (error) {
    console.log('⚠️ OBS Client initialization failed, using memory-only mode');
    obsClient = null;
  }
} else {
  console.log('📦 Using memory-only mode (OBS not configured)');
}

// ============================================
// AUTH ENDPOINTS
// ============================================

/**
 * Signup endpoint - creates a new user
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, surname, cell, emergencyContacts } = req.body;
    
    console.log('📝 Signup attempt for email:', email);
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'USER_EXISTS' });
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user object
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userData = {
      userId,
      email,
      password: hashedPassword, // Store hashed password, not plain text
      name: name || '',
      surname: surname || '',
      cell: cell || '',
      emergencyContacts: emergencyContacts || [],
      createdAt: new Date().toISOString()
    };
    
    // Save to memory
    users.push(userData);
    
    // Save to file (optional)
    saveUsersToFile();
    
    // Try to save to OBS as backup (don't await)
    if (obsClient) {
      const objectKey = `users/${userId}/profile.json`;
      const userForOBS = { ...userData };
      delete userForOBS.password; // Don't store password in OBS
      
      obsClient.putObject({
        Bucket: process.env.HW_OBS_BUCKET,
        Key: objectKey,
        Body: JSON.stringify(userForOBS, null, 2),
        ContentType: 'application/json'
      }, (err) => {
        if (err) {
          console.log(`📦 OBS backup failed for ${email}: ${err.message}`);
        } else {
          console.log(`📦 OBS backup successful: ${objectKey}`);
        }
      });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = userData;
    
    console.log(`✅ Signup successful: ${email}`);
    console.log(`📁 Total users: ${users.length}`);
    
    res.json({
      success: true,
      user: userWithoutPassword,
      tempCredentials: null
    });
    
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Login endpoint - authenticates existing user
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('📝 Login attempt for email:', email);
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user by email
    const user = users.find(u => u.email === email);
    
    // Check if user exists
    if (!user) {
      console.log(`❌ Login failed: User not found - ${email}`);
      return res.status(401).json({ error: 'USER_NOT_FOUND' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`❌ Login failed: Invalid password for ${email}`);
      return res.status(401).json({ error: 'INVALID_PASSWORD' });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    console.log(`✅ Login successful: ${email}`);
    
    res.json({
      success: true,
      user: userWithoutPassword,
      tempCredentials: null
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user by ID
 */
app.get('/api/auth/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = users.find(u => u.userId === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update user profile
 */
app.put('/api/auth/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, surname, cell, emergencyContacts } = req.body;
    
    const userIndex = users.findIndex(u => u.userId === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user fields
    users[userIndex] = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      surname: surname || users[userIndex].surname,
      cell: cell || users[userIndex].cell,
      emergencyContacts: emergencyContacts || users[userIndex].emergencyContacts,
      updatedAt: new Date().toISOString()
    };
    
    // Save to file
    saveUsersToFile();
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = users[userIndex];
    
    console.log(`✅ User updated: ${users[userIndex].email}`);
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// EXISTING ROUTES
// ============================================

// Root route
app.get('/', (req, res) => {
  res.send('✅ SafeMap Backend Running');
});

// Crime data route
app.get('/api/crimes', (req, res) => {
  res.json(crimes);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      crimes: crimes.length > 0 ? 'loaded' : 'empty',
      gemini: !!process.env.GEMINI_API_KEY,
      huaweiOBS: !!(process.env.HW_ACCESS_KEY && process.env.HW_SECRET_KEY),
      users: users.length
    }
  });
});

// Debug endpoint to see all users (remove in production)
app.get('/api/debug/users', (req, res) => {
  const safeUsers = users.map(({ password, ...user }) => user);
  res.json({
    count: users.length,
    users: safeUsers
  });
});

// Gemini helper
async function askGemini(prompt) {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    return res.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    return "I'm having trouble processing your request right now.";
  }
}

// Haversine formula
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Crime summarizer
function summarizeCrime(lat, lng, radiusKm = 1) {
  if (!crimes || crimes.length === 0) {
    return {
      summary: "Crime data is currently unavailable.",
      crimeCount: 0,
      neighbourhood: "this area",
      safetyLevel: "unknown",
      safetyEmoji: "❓"
    };
  }

  const crimesInRadius = crimes.filter((c) => {
    if (!c.X || !c.Y) return false;
    try {
      const { latitude, longitude } = utm.toLatLon(+c.X, +c.Y, 34, 'S');
      const dist = haversine(lat, lng, latitude, longitude);
      return dist <= radiusKm;
    } catch {
      return false;
    }
  });

  const total = crimesInRadius.length;
  let topNeighbourhood = "this area";

  if (total > 0) {
    const nbCounts = {};
    crimesInRadius.forEach((c) => {
      const nb = c.NEIGHBOURHOOD || "this area";
      nbCounts[nb] = (nbCounts[nb] || 0) + 1;
    });
    topNeighbourhood = Object.entries(nbCounts).sort((a, b) => b[1] - a[1])[0][0];
  }

  if (total === 0) {
    return {
      summary: `In the past months within ${radiusKm} km, less crimes were reported in ${topNeighbourhood}.`,
      crimeCount: 0,
      neighbourhood: topNeighbourhood,
      safetyLevel: "generally safe",
      safetyEmoji: "✅"
    };
  }

  const typeCounts = {};
  crimesInRadius.forEach((c) => {
    typeCounts[c.TYPE] = (typeCounts[c.TYPE] || 0) + 1;
  });

  const sortedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const typeSummary = sortedTypes
    .map(([type, count]) => `${type} (${Math.round((count / total) * 100)}%)`)
    .join(" and ");

  const SAFE_THRESHOLD = 229;
  const MEDIUM_THRESHOLD = 270;
  
  let safetyLevel = "generally safe";
  let safetyEmoji = "✅";
  
  if (total > MEDIUM_THRESHOLD) {
    safetyLevel = "high risk";
    safetyEmoji = "🚨";
  } else if (total > SAFE_THRESHOLD) {
    safetyLevel = "moderate risk";
    safetyEmoji = "⚠️";
  }

  return {
    summary: `In ${topNeighbourhood}, in the past months within ${radiusKm} km, there were ${total} crimes, most commonly ${typeSummary}.`,
    crimeCount: total,
    neighbourhood: topNeighbourhood,
    safetyLevel,
    safetyEmoji
  };
}

// Assistant route
app.post('/api/assistant', async (req, res) => {
  try {
    const { question, lat, lng, radiusKm, crimeCount } = req.body;
    let crimeData;

    if (crimeCount !== undefined && crimeCount !== null) {
      crimeData = {
        crimeCount: crimeCount,
        neighbourhood: "this neighborhood",
        safetyLevel: crimeCount < 230 ? "generally safe" : crimeCount < 271 ? "moderate risk" : "high risk",
        safetyEmoji: crimeCount < 230 ? "✅" : crimeCount < 271 ? "⚠️" : "🚨"
      };
    } else if (lat && lng) {
      crimeData = summarizeCrime(lat, lng, radiusKm || 1);
    } else {
      crimeData = {
        crimeCount: 0,
        neighbourhood: "your area",
        safetyLevel: "unknown",
        safetyEmoji: "❓"
      };
    }

    const loadsheddingStatus = await checkLoadsheddingStatus();

    const prompt = `
      You are a South African safety assistant. You must always state the CRIME situation clearly before giving any advice.

CRIME SITUATION FOR ${crimeData.neighbourhood.toUpperCase()}:
- Safety Level: ${crimeData.safetyEmoji} ${crimeData.safetyLevel}
- Area: ${crimeData.neighbourhood}
- Context: ${crimeData.crimeCount === 0 ? 
  `${crimeData.neighbourhood} has had fewer crime reports recently.` : 
  `${crimeData.neighbourhood} has experienced various types of crime in recent months.`}

User question: "${question}"

If unrelated to crime safety, respond: "I specialize in South African crime safety information. I can help you understand crime risks and safety measures in your area."`;

    const answer = await askGemini(prompt);
    res.json({ 
      answer,
      crimeData,
      loadsheddingStatus
    });
  } catch (e) {
    console.error('Assistant error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Loadshedding status checker
async function checkLoadsheddingStatus() {
  try {
    const response = await axios.get('https://developer.sepush.co.za/business/2.0/status', {
      headers: {
        'Token': process.env.ESKOM_SEPUSH_API_KEY || 'demo'
      },
      timeout: 5000
    });
    
    return {
      active: response.data.status.eskom ? true : false,
      stage: response.data.status.eskom?.stage || 0,
      updated: response.data.status.timestamp || new Date().toISOString(),
      source: 'EskomSePush'
    };
  } catch (error) {
    return {
      active: false,
      stage: 0,
      updated: new Date().toISOString(),
      source: 'fallback',
      note: 'Live status unavailable'
    };
  }
}

// Geocode route
app.get('/api/geocode', async (req, res) => {
  const { address } = req.query;
  if (!address) {
    return res.status(400).json({ error: 'Address query parameter is required' });
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching from Google Maps:', error);
    res.status(500).json({ error: 'Failed to fetch data from Google Maps' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ SafeMap Backend running on port ${PORT}`);
  console.log(`📁 User storage: ${USERS_FILE} (${users.length} users loaded)`);
});