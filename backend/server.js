import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";
import utm from 'utm';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// Load crime data safely
const crimeDataPath = path.resolve('src/assets/data/filtered2010-2025.json');
const crimes = JSON.parse(fs.readFileSync(crimeDataPath, 'utf-8'));

// Gemini setup
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Root route
app.get('/', (req, res) => {
  res.send('✅ SafeMap Backend Running on Render');
});

// Crime data route
app.get('/api/crimes', (req, res) => {
  res.json(crimes);
});

// Gemini helper
async function askGemini(prompt) {
  const res = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  return res.candidates[0].content.parts[0].text;
}

// Haversine formula
function haversine(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Crime summarizer
function summarizeCrime(lat, lng, radiusKm = 1) {
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

  // Determine safety level
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

// Loadshedding status checker
async function checkLoadsheddingStatus() {
  try {
    // Using EskomSePush API or similar service
    const response = await axios.get('https://developer.sepush.co.za/business/2.0/status', {
      headers: {
        'Token': process.env.ESKOM_SEPUSH_API_KEY || 'demo'
      }
    });
    
    return {
      active: response.data.status.eskom ? true : false,
      stage: response.data.status.eskom?.stage || 0,
      updated: response.data.status.timestamp || new Date().toISOString(),
      source: 'EskomSePush'
    };
  } catch (error) {
    console.log('EskomSePush API failed, using fallback method');
    
    // Fallback: Check time-based probability (this is a simple heuristic)
    const now = new Date();
    const hour = now.getHours();
    const isPeakTime = (hour >= 6 && hour <= 10) || (hour >= 16 && hour <= 22);
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    
    // Simple probability based on time patterns
    let active = false;
    let stage = 0;
    
    if (isWeekday && isPeakTime) {
      active = Math.random() > 0.3; // 70% chance during peak hours
      stage = active ? Math.floor(Math.random() * 4) + 1 : 0;
    } else {
      active = Math.random() > 0.7; // 30% chance during off-peak
      stage = active ? Math.floor(Math.random() * 2) + 1 : 0;
    }
    
    return {
      active,
      stage,
      updated: now.toISOString(),
      source: 'time-based-estimate',
      note: 'For accurate loadshedding status, please provide EskomSePush API key'
    };
  }
}

// Assistant route - Updated to state crime and loadshedding first
app.post('/api/assistant', async (req, res) => {
  try {
    const { question, lat, lng, radiusKm, crimeCount } = req.body;
    let crimeData, loadsheddingStatus;

    // Get crime data
    if (crimeCount !== undefined && crimeCount !== null) {
      crimeData = {
        crimeCount: crimeCount,
        neighbourhood: "this neighborhood",
        safetyLevel: crimeCount < 230 ? "generally safe" : crimeCount < 271 ? "moderate risk" : "high risk",
        safetyEmoji: crimeCount < 230 ? "✅" : crimeCount < 271 ? "⚠️" : "🚨"
      };
    } else {
      const result = summarizeCrime(lat, lng, radiusKm);
      crimeData = result;
    }

    // Get loadshedding status
    loadsheddingStatus = await checkLoadsheddingStatus();

    const prompt = `
      You are a South African safety assistant. You must always state the CRIME situation clearly before giving any advice.

CRIME SITUATION FOR ${crimeData.neighbourhood.toUpperCase()}:
- Safety Level: ${crimeData.safetyEmoji} ${crimeData.safetyLevel}
- Area: ${crimeData.neighbourhood}
- Context: ${crimeData.crimeCount === 0 ? 
  `${crimeData.neighbourhood} has had fewer crime reports recently.` : 
  `${crimeData.neighbourhood} has experienced various types of crime in recent months.`}

User question: "${question}"

RESPONSE STRUCTURE - YOU MUST FOLLOW THIS ORDER:
1. FIRST state the crime safety situation clearly
2. THEN offer safety advice based on the crime risk level

EXAMPLE RESPONSE FORMAT:
"CRIME SITUATION: ${crimeData.safetyEmoji} ${crimeData.neighbourhood} is ${crimeData.safetyLevel} based on recent crime patterns.

SAFETY ADVICE: [Your specific advice focusing on crime prevention and safety measures]"

IMPORTANT RULES:
- ONLY discuss crime safety information
- ALWAYS state crime situation first, then advice
- Use clear headings: "CRIME SITUATION:", "SAFETY ADVICE:"
- Keep advice practical and specific to the area's crime risk level
- If area is high risk, emphasize extra precautions
- Maximum 4 sentences total
- Use simple, clear language
- Always mention the actual area name instead of saying "this area" or "this neighborhood"

If unrelated to crime safety, respond: "I specialize in South African crime safety information. I can help you understand crime risks and safety measures in your area."`;

    const answer = await askGemini(prompt);
    res.json({ 
      answer,
      crimeData: {
        neighbourhood: crimeData.neighbourhood,
        safetyLevel: crimeData.safetyLevel,
        safetyEmoji: crimeData.safetyEmoji,
        crimeCount: crimeData.crimeCount
      },
      loadsheddingStatus: {
        active: loadsheddingStatus.active,
        stage: loadsheddingStatus.stage,
        updated: loadsheddingStatus.updated,
        source: loadsheddingStatus.source
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

// New endpoint to get loadshedding status alone
app.get('/api/loadshedding-status', async (req, res) => {
  try {
    const status = await checkLoadsheddingStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking loadshedding status:', error);
    res.status(500).json({ error: 'Failed to fetch loadshedding status' });
  }
});

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
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching from Google Maps:', error);
    res.status(500).json({ error: 'Failed to fetch data from Google Maps' });
  }
});

// Start server
app.listen(PORT, () => console.log(`✅ SafeMap Backend running on port ${PORT}`));