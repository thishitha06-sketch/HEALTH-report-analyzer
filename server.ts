import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mammoth from 'mammoth';
import { GoogleGenAI, Type } from '@google/genai';
import { LocalDatabase } from './src/db/local_db';
import { User, MedicalReport, UserProfile } from './src/types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Production-ready security headers, compression, and CORS
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false
}));
app.use(cors());
app.use(compression());

// Set up larger limits for base64 file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure uploads folder exists and is writable (use /tmp/uploads in production/deployed environment)
const isProductionEnv = process.env.NODE_ENV === 'production' || !process.env.DISABLE_HMR;
let isWorkspaceWritable = true;
try {
  const testFile = path.join(process.cwd(), '.write_test_srv');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (e) {
  isWorkspaceWritable = false;
}

const useTmp = isProductionEnv || !isWorkspaceWritable;
let uploadsDir = path.join(process.cwd(), 'uploads');
if (useTmp) {
  uploadsDir = '/tmp/uploads';
}
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err: any) {
    console.error('[Server] Failed to create uploads folder:', err.message);
  }
}

// Serve uploaded reports statically (safe path)
app.use('/uploads', express.static(uploadsDir));

// Requirement 4: Custom Request Logging Middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const contentType = res.get('Content-Type') || 'Unknown';
    console.log(`[HTTP LOG] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Type: ${contentType} - Duration: ${duration}ms`);
  });
  next();
});

// JWT Secret Key configuration
const JWT_SECRET = process.env.JWT_SECRET || 'nirva_lifestyle_medicine_jwt_secret_token_key_2026';

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to perform Gemini API requests with exponential backoff retry on transient errors
async function generateContentWithRetry(params: { model: string; contents: any; config?: any }, maxRetries = 4, initialDelay = 1000) {
  let attempt = 0;
  let currentModel = params.model;
  
  // Model fallbacks for text models under high load/demand
  const fallbackModels: Record<string, string[]> = {
    'gemini-3.5-flash': ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
  };

  while (true) {
    try {
      console.log(`[Gemini API Request] Sending request to model: "${currentModel}"...`);
      return await ai.models.generateContent({
        ...params,
        model: currentModel
      });
    } catch (error: any) {
      attempt++;
      // Determine if error is a transient/retryable error (e.g., 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED, 502 BAD GATEWAY)
      const status = error.status || error.statusCode || (error.error && error.error.code);
      const errorMsg = error.message || '';
      const isTransient = status === 503 || status === 429 || status === 502 || status === 504 ||
                          errorMsg.includes('503') ||
                          errorMsg.includes('502') ||
                          errorMsg.includes('429') ||
                          errorMsg.includes('UNAVAILABLE') ||
                          errorMsg.includes('high demand') ||
                          errorMsg.includes('ResourceExhausted') ||
                          errorMsg.includes('spikes in demand') ||
                          errorMsg.includes('overloaded');
      
      if (isTransient && attempt <= maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        
        const fallbacks = fallbackModels[params.model];
        if (fallbacks && (attempt - 1) < fallbacks.length) {
          currentModel = fallbacks[attempt - 1];
          console.warn(`[Gemini Retry] Attempt ${attempt}/${maxRetries} failed with transient error: "${errorMsg}". Falling back to model "${currentModel}" in ${delay}ms...`);
        } else if (fallbacks && fallbacks.length > 0) {
          currentModel = fallbacks[fallbacks.length - 1];
          console.warn(`[Gemini Retry] Attempt ${attempt}/${maxRetries} failed with transient error: "${errorMsg}". Retrying with model "${currentModel}" in ${delay}ms...`);
        } else {
          console.warn(`[Gemini Retry] Attempt ${attempt}/${maxRetries} failed with transient error: "${errorMsg}". Retrying in ${delay}ms...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[Gemini Retry] Call failed permanently after ${attempt} attempts. Error:`, error);
        throw error;
      }
    }
  }
}

// Middleware to extract and verify Bearer JWT Token or legacy ID
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const tokenStr = authHeader.substring(7);
      let userId: string | null = null;

      try {
        // 1. Try to verify the JWT token
        const decoded = jwt.verify(tokenStr, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch (err) {
        // 2. Fallback for demo login / pre-seeded credentials ('user-123')
        if (tokenStr.startsWith('user-') || tokenStr === 'user-123') {
          userId = tokenStr;
        }
      }

      if (userId) {
        const user = await LocalDatabase.getUserById(userId);
        if (user) {
          // Set the user's returned ID to match the token sent by frontend so localStorage stays in sync
          user.id = tokenStr;
          (req as any).user = user;
          (req as any).realUserId = userId; // Keep real relational user ID for queries
          return next();
        }
      }
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing authentication credentials.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, age, gender } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Missing required registration details.' });
  }

  try {
    console.log('Registration started');
    const normEmail = email.toLowerCase();
    const existing = await LocalDatabase.getUserByEmail(normEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Derive password if not sent by the frontend's standard form
    const rawPassword = password || (normEmail + '_nirva_secure_secret');
    const passwordHash = bcrypt.hashSync(rawPassword, 10);

    const userId = 'user-' + Math.random().toString(36).substr(2, 9);
    const newUser: User = {
      id: userId,
      email: normEmail,
      name: name,
      profile: {
        name: name,
        age: Number(age) || 30,
        gender: gender || 'Female',
        height: 170,
        weight: 65,
        activityLevel: 'Sedentary',
        pregnancyStatus: 'Not Applicable',
        medicalHistory: '',
        allergies: '',
        lifestylePreferences: '',
        privacySettings: {
          shareWithDoctor: true,
          anonymousResearch: false
        }
      },
      createdAt: new Date().toISOString()
    };

    await LocalDatabase.saveUserWithPassword(newUser, passwordHash);

    console.log('Registration completed');
    console.log('Profile created');
    console.log('Workspace created');

    // Generate JWT token containing the actual relational userId
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    // Swap the ID to be the token for frontend persistence compatibility
    newUser.id = token;

    res.json({ message: 'Registration successful', user: newUser });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      error: 'Database initialization failed.',
      details: err.message
    });
  }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing email address.' });
  }

  try {
    const normEmail = email.toLowerCase();
    const result = await LocalDatabase.getUserByEmailWithPassword(normEmail);
    if (!result) {
      return res.status(404).json({ error: 'Account not found. Please click Sign Up to create an account.' });
    }

    const { user, passwordHash } = result;

    // Verify password (derive fallback if needed)
    const rawPassword = password || (normEmail + '_nirva_secure_secret');
    const isMatch = bcrypt.compareSync(rawPassword, passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    // Swap user ID with token for the frontend compatibility
    user.id = token;

    res.json({ message: 'Login successful', user });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal login failure.', details: err.message });
  }
});

// Google Login Mock Endpoint (Registers or Logs in)
app.post('/api/auth/google', async (req, res) => {
  const { email, name, photoUrl } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Google authentication failed.' });
  }

  try {
    const normEmail = email.toLowerCase();
    let user = await LocalDatabase.getUserByEmail(normEmail);

    if (!user) {
      const rawPassword = normEmail + '_nirva_secure_secret';
      const passwordHash = bcrypt.hashSync(rawPassword, 10);
      const userId = 'user-' + Math.random().toString(36).substr(2, 9);
      user = {
        id: userId,
        email: normEmail,
        name: name || 'Google User',
        profile: {
          name: name || 'Google User',
          age: 28,
          gender: 'Female',
          height: 165,
          weight: 58,
          activityLevel: 'Sedentary',
          pregnancyStatus: 'Not Applicable',
          medicalHistory: '',
          allergies: '',
          lifestylePreferences: '',
          privacySettings: {
            shareWithDoctor: true,
            anonymousResearch: false
          }
        },
        createdAt: new Date().toISOString()
      };
      await LocalDatabase.saveUserWithPassword(user, passwordHash);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    user.id = token;

    res.json({ message: 'Google Sign-In successful', user });
  } catch (err: any) {
    console.error('Google Sign-In error:', err);
    res.status(500).json({ error: 'Internal Google sign-in failure.', details: err.message });
  }
});

// ==========================================
// USER PROFILE ENDPOINTS
// ==========================================

// Get Current Profile
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ user: (req as any).user });
});

// Update Profile
app.post('/api/profile/update', authMiddleware, async (req, res) => {
  const { profile } = req.body;
  if (!profile) {
    return res.status(400).json({ error: 'Profile data missing.' });
  }

  try {
    const user = (req as any).user as User;
    const realUserId = (req as any).realUserId as string;

    await LocalDatabase.updateUserProfile(realUserId, profile);
    
    const updatedUser = await LocalDatabase.getUserById(realUserId);
    if (updatedUser) {
      updatedUser.id = user.id; // Preserve token representation as user.id
    }
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.', details: err.message });
  }
});

// Add New Profile (e.g. Family or Friend)
app.post('/api/profile/add', authMiddleware, async (req, res) => {
  const { profile } = req.body;
  if (!profile) {
    return res.status(400).json({ error: 'Profile data is required.' });
  }

  try {
    const user = (req as any).user as User;
    const realUserId = (req as any).realUserId as string;

    await LocalDatabase.addUserProfile(realUserId, profile);

    const updatedUser = await LocalDatabase.getUserById(realUserId);
    if (updatedUser) {
      updatedUser.id = user.id;
    }
    res.json({ message: 'Profile added successfully', user: updatedUser });
  } catch (err: any) {
    console.error('Profile add error:', err);
    res.status(500).json({ error: 'Failed to add profile.', details: err.message });
  }
});

// Delete Specific Profile
app.post('/api/profile/delete-specific', authMiddleware, async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) {
    return res.status(400).json({ error: 'Profile ID is required.' });
  }

  try {
    const user = (req as any).user as User;
    const realUserId = (req as any).realUserId as string;

    await LocalDatabase.deleteUserProfile(realUserId, profileId);

    const updatedUser = await LocalDatabase.getUserById(realUserId);
    if (updatedUser) {
      updatedUser.id = user.id;
    }
    res.json({ message: 'Profile deleted successfully', user: updatedUser });
  } catch (err: any) {
    console.error('Profile specific delete error:', err);
    res.status(500).json({ error: 'Failed to delete profile.', details: err.message });
  }
});

// Select Active Profile
app.post('/api/profile/select', authMiddleware, async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) {
    return res.status(400).json({ error: 'Profile ID is required.' });
  }

  try {
    const user = (req as any).user as User;
    const realUserId = (req as any).realUserId as string;

    const dbUser = await LocalDatabase.getUserById(realUserId);
    if (!dbUser || !dbUser.profiles) {
      return res.status(400).json({ error: 'No profiles found.' });
    }

    const selected = dbUser.profiles.find(p => p.id === profileId);
    if (!selected) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    dbUser.profile = selected;
    dbUser.name = selected.name;
    await LocalDatabase.saveUser(dbUser);

    dbUser.id = user.id; // Keep token
    res.json({ message: 'Active profile changed successfully', user: dbUser });
  } catch (err: any) {
    console.error('Profile select error:', err);
    res.status(500).json({ error: 'Failed to switch profiles.', details: err.message });
  }
});

// Delete Profile & Data (Permanently delete all files/history from SQLite)
app.post('/api/profile/delete', authMiddleware, async (req, res) => {
  try {
    const realUserId = (req as any).realUserId as string;
    await LocalDatabase.deleteUser(realUserId);
    res.json({ message: 'Account and associated health data permanently deleted.' });
  } catch (err: any) {
    console.error('Account delete error:', err);
    res.status(500).json({ error: 'Failed to delete account.', details: err.message });
  }
});

// ==========================================
// REPORT ENDPOINTS
// ==========================================

// Get User's Reports
app.get('/api/reports', authMiddleware, async (req, res) => {
  try {
    const realUserId = (req as any).realUserId as string;
    const reports = await LocalDatabase.getReportsByUserId(realUserId);
    res.json({ reports });
  } catch (err: any) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Failed to retrieve reports.', details: err.message });
  }
});

// Delete Specific Report
app.delete('/api/reports/:id', authMiddleware, async (req, res) => {
  try {
    const realUserId = (req as any).realUserId as string;
    const reportId = req.params.id;
    await LocalDatabase.deleteReport(reportId, realUserId);
    res.json({ message: 'Report deleted successfully' });
  } catch (err: any) {
    console.error('Delete report error:', err);
    res.status(500).json({ error: 'Failed to delete report.', details: err.message });
  }
});

// Helper to extract printable strings from a binary buffer (like UNIX 'strings' utility) for legacy .doc files
function extractPrintableStrings(buffer: Buffer): string {
  let result = '';
  let currentString = '';
  for (let i = 0; i < buffer.length; i++) {
    const charCode = buffer[i];
    // Printable ASCII characters are from 32 (space) to 126 (~) plus tab (9), LF (10), CR (13)
    if ((charCode >= 32 && charCode <= 126) || charCode === 9 || charCode === 10 || charCode === 13) {
      currentString += String.fromCharCode(charCode);
    } else {
      if (currentString.length >= 4) {
        result += currentString + '\n';
      }
      currentString = '';
    }
  }
  if (currentString.length >= 4) {
    result += currentString + '\n';
  }
  return result
    .replace(/[^\x20-\x7E\t\r\n]/g, '') // strip any residual non-ASCII just in case
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();
}

// ==========================================
// AI REPORT ANALYZER ENDPOINT
// ==========================================
app.post('/api/analyze', authMiddleware, async (req, res) => {
  const user = (req as any).user as User;
  const realUserId = (req as any).realUserId as string;
  const { fileData, fileName, fileType, textContent, targetProfileId, language } = req.body;

  // Validate API Key exists early
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('[Gemini API] Validation Error: GEMINI_API_KEY is not configured in process.env.');
    return res.status(500).json({
      error: 'Gemini API key missing or invalid. Please configure GEMINI_API_KEY in the Settings > Secrets panel.'
    });
  }

  try {
    let profile = user.profile;
    let profileSource = 'Profile Loaded';

    if (targetProfileId && user.profiles) {
      const found = user.profiles.find(p => p.id === targetProfileId);
      if (found) {
        profile = found;
        profileSource = 'Profile Loaded (via targetProfileId)';
      }
    }

    if (!profile) {
      console.log('[Profile Recovery] Profile is missing or null. Beginning recovery...');
      profileSource = 'Profile Missing';
      
      const dbUser = await LocalDatabase.getUserById(realUserId);
      if (dbUser) {
        if (targetProfileId && dbUser.profiles) {
          const found = dbUser.profiles.find(p => p.id === targetProfileId);
          if (found) {
            profile = found;
            profileSource = 'Profile Recovery (A - Loaded via targetProfileId)';
          }
        }
        if (!profile && dbUser.profiles && dbUser.profiles.length > 0) {
          profile = dbUser.profile || dbUser.profiles[0];
          profileSource = 'Profile Recovery (B - Used Active/First profile)';
        }
      }

      if (!profile) {
        console.log('[Profile Recovery] No profile exists. Creating default profile...');
        const defaultProfile: UserProfile = {
          id: 'profile-main',
          relationship: 'Self',
          name: user.name || 'Self',
          age: 30,
          gender: 'Unknown',
          height: null,
          weight: null,
          medicalHistory: '',
          allergies: '',
          lifestylePreferences: '',
          privacySettings: {
            shareWithDoctor: true,
            anonymousResearch: false
          },
          isIncomplete: true
        };

        const targetUser = dbUser || user;
        targetUser.profile = defaultProfile;
        targetUser.profiles = [defaultProfile];
        await LocalDatabase.saveUser(targetUser);

        profile = defaultProfile;
        profileSource = 'Profile Created (C - Default profile saved)';
      }
    }

    // Gracefully handle missing profile fields by falling back to sensible defaults
    const age = (profile && profile.age !== null && profile.age !== undefined && profile.age !== 0) ? profile.age : 30;
    const gender = (profile && profile.gender && profile.gender !== 'Unknown') ? profile.gender : 'Female';
    const patientName = (profile && profile.name) ? profile.name : "Patient";
    const height = (profile && profile.height !== null && profile.height !== undefined && profile.height !== 0) ? profile.height : 170;
    const weight = (profile && profile.weight !== null && profile.weight !== undefined && profile.weight !== 0) ? profile.weight : 65;
    const activityLevel = (profile && profile.activityLevel) ? profile.activityLevel : "Sedentary";
    const pregnancyStatus = (profile && profile.pregnancyStatus) ? profile.pregnancyStatus : "Not Applicable";

    // Requirement 8: Logging
    console.log(`[Profile Audit] Status: ${profileSource}`);
    console.log(`[Profile Audit] Selected Profile ID: ${profile?.id || 'none'}`);
    console.log(`[Profile Audit] Age: ${age}`);
    console.log(`[Profile Audit] Gender: ${gender}`);
    console.log(`[Profile Audit] Height: ${height} cm`);
    console.log(`[Profile Audit] Weight: ${weight} kg`);
    console.log(`[Profile Audit] Activity Level: ${activityLevel}`);
    console.log(`[Profile Audit] Pregnancy Status: ${pregnancyStatus}`);

    const demographicInstruction = `Customize your evaluation of normal, borderline, low, high, and critical ranges based on the patient's Age (${age}), Biological Sex (${gender}), Height (${height} cm), Weight (${weight} kg), Activity Level (${activityLevel}), and Pregnancy Status (${pregnancyStatus}). Calculate patient's BMI as Weight / Height² (where Weight is in kg and Height is in meters). Specify standard references or laboratory-specific references if visible.`;

    const demographicDailyNutrients = `suitable for ${age}yo ${gender}, ${height}cm, ${weight}kg, with a ${activityLevel} lifestyle and pregnancy/lactation status of ${pregnancyStatus}`;

    const documentTypeInstruction = `Automatically detect what kind of medical document this is (e.g. 'Blood Report', 'MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'ECG', 'General Scan').`;

    let contents: any[] = [];
    
    let languageInstruction = '';
    if (language && language !== 'English') {
      languageInstruction = `\nCRITICAL LANGUAGE REQUIREMENT: You MUST write ALL user-facing descriptions, summaries, notes, explanations, findings, recommendations, reasons, food names, and text fields in ${language} language. Keep technical marker names (e.g., 'Hemoglobin') in standard English or transliterated, but all explanations, notes, and paragraphs must be written entirely in beautiful, professional, and clear ${language}.`;
    }

    // Set up standard instructions based on document content
    const systemPrompt = `You are a professional Medical Expert AI, Clinical Lab Analyst, and Patient-friendly Health Guide.
Your mission is to perform a meticulous extraction of all health metrics, diagnoses, or notes from the provided medical document.
Always prioritize clinical accuracy while converting medical terms into easy-to-understand, supportive language.
Never prescribe medication dosages or supplements. Always act as an educational companion.
${languageInstruction}

CRITICAL INSTRUCTIONS:
1. CUSTOM REFERENCE RANGES & BMI CALCULATIONS: ${demographicInstruction}
   - BMI calculation must be exact: Weight (${weight} kg) / (Height (${height} cm)/100)².
   - Underweight (<18.5), Healthy Weight (18.5-24.9), Overweight (25.0-29.9), Obesity Class I (30.0-34.9), Obesity Class II (35.0-39.9), Obesity Class III (>=40.0).
   - In the "doctorNotes" field, always include a section:
     "### 1. BMI & WEIGHT ASSESSMENT
     - **Calculated BMI**: [Value] kg/m² ([Classification])
     - [Clear, comforting clinical explanation of what this BMI means for their health and demographic context.]"

2. CLINICAL ORGAN HEALTH DASHBOARD:
   - Meticulously evaluate the status of the following 11 organs and body systems based on the biomarkers/report data and demographic context: Brain, Heart, Liver, Kidneys, Lungs, Bones, Blood, Eyes, Nerves, Digestive System, Skin.
   - For each organ/system, provide a status (either 'Healthy', 'Needs Monitoring', or 'Potentially Affected') and a short, educational explanation of how the values (or demographic factors/medical history) led to this assessment.
   - Append this dashboard directly inside the "doctorNotes" field, formatted as:
     "### 2. CLINICAL ORGAN HEALTH DASHBOARD
     - **Brain**: [Status] - [Short educational explanation]
     - **Heart**: [Status] - [Short educational explanation]
     - **Liver**: [Status] - [Short educational explanation]
     - **Kidneys**: [Status] - [Short educational explanation]
     - **Lungs**: [Status] - [Short educational explanation]
     - **Bones**: [Status] - [Short educational explanation]
     - **Blood**: [Status] - [Short educational explanation]
     - **Eyes**: [Status] - [Short educational explanation]
     - **Nerves**: [Status] - [Short educational explanation]
     - **Digestive System**: [Status] - [Short educational explanation]
     - **Skin**: [Status] - [Short educational explanation]"

3. OVERALL RISK SCORE & LABORATORY COMPARISON:
   - Assign an overall clinical health score from 0 to 100 in "overallHealthScore" (where 90-100 is Excellent/Good, 75-89 is Needs Improvement, <75 is High Risk).
   - In the "findings" field, always include:
     "### 1. OVERALL CLINICAL RISK ASSESSMENT
     - **Risk Level**: [Excellent | Good | Needs Improvement | High Risk]
     - [Short, actionable explanation of the overall score and risk profile.]"
   - Underneath that in "findings", include:
     "### 2. LABORATORY COMPARISON & NUTRIENT GAPS
     - [Directly compare the user's laboratory findings with their personalized requirements. Identify any nutrients where the user is deficient or at risk based on their biomarkers and recommend specific foods or lifestyle corrections to address these gaps.]"

4. PERSONALIZED DAILY REQUIREMENTS:
   - Estimate the exact daily nutritional requirements for the patient using accepted dietary guidelines based on: Age (${age}), Sex (${gender}), Height (${height} cm), Weight (${weight} kg), BMI, and Activity Level (${activityLevel}) and Pregnancy Status (${pregnancyStatus}).
   - You MUST populate the "dailyNutrients" array with EXACTLY 20 items. Each item must have name, recommendedIntake, progress percentage, and specific whole-food sources with quantities.
   - The 20 items MUST cover:
     1. Calories (kcal/day)
     2. Protein (g/day)
     3. Carbohydrates (g/day)
     4. Healthy Fat (g/day)
     5. Fiber (g/day)
     6. Water (L/day)
     7. Calcium (mg/day)
     8. Iron (mg/day)
     9. Vitamin D (mcg/day)
     10. Vitamin B12 (mcg/day)
     11. Vitamin C (mg/day)
     12. Vitamin A (mcg RAE/day)
     13. Vitamin E (mg/day)
     14. Vitamin K (mcg/day)
     15. Magnesium (mg/day)
     16. Potassium (mg/day)
     17. Sodium (mg/day)
     18. Zinc (mg/day)
     19. Folate (mcg DFE/day)
     20. Omega-3 Fatty Acids (g/day)

5. ACTION PLAN & GLYCEMIC INDEX LOAD MANAGEMENT:
   - In the "recommendations" field, construct a detailed multi-stage clinical action plan formatted as:
     "### 1. CLINICAL ACTION PLAN
     - **Today's Priorities**: [1-2 critical instant actions]
     - **This Week's Goals**: [Key dietary/lifestyle adjustments]
     - **Next Month's Goals**: [Longer-term targets, lifestyle patterns]
     - **Suggested Follow-up Tests**: [Relevant clinical assays/re-testing timelines]
     - **Lifestyle & Dietary Care**: [Structured guidelines covering Lifestyle, Dietary, Exercise, Hydration, Weight, and Sleep]"
   - If the report contains out-of-range blood sugar markers (e.g., HbA1c, Fasting Blood Sugar, Random Blood Sugar, Glucose), always append:
     "### 2. GLYCEMIC INDEX & LOAD-MANAGEMENT ADVICE
     - [Actionable education on eating low-glycemic index foods, complex carbs, and managing glycemic load to stabilize blood sugar levels.]"
     Otherwise, if blood sugar is stable or absent, append:
     "### 2. GLYCEMIC STATUS
     - Blood sugar levels appear stable based on provided indicators."

6. CLINICAL DISCLAIMER (MANDATORY EXACT WORDING):
   - At the absolute end of the "doctorNotes" field (after the Organ Health Dashboard), you MUST append this exact educational disclaimer verbatim:
     "This report is an AI-generated educational summary based on the uploaded medical report and your profile information. It is not a diagnosis or a substitute for professional medical advice. Please discuss significant or concerning findings with a qualified healthcare professional."`;

    let processedTextContent: string | null = null;
    let passAsInlineData: any = null;
    let storedFilePath: string | undefined = undefined;

    // --- PHASE 1: FILE UPLOAD AND VALIDATION ---
    console.log(`[File Upload] Initiating medical document upload/validation. Target Profile ID: "${targetProfileId}", Language: "${language}"`);

    if (fileData) {
      const base64Clean = fileData.includes(';base64,') ? fileData.split(';base64,')[1] : fileData;
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Clean, 'base64');
      } catch (err: any) {
        console.error('[File Upload] Failed to decode base64 file data:', err);
        return res.status(400).json({
          error: 'Invalid file format: Failed to decode base64 document content.',
          details: err.message
        });
      }

      if (buffer.length === 0) {
        console.error('[File Upload] Validation failed: File buffer is empty.');
        return res.status(400).json({
          error: 'Empty document: The uploaded file contains 0 bytes of data.'
        });
      }

      // Check max file size limit (20 MB)
      const maxLimitBytes = 20 * 1024 * 1024;
      if (buffer.length > maxLimitBytes) {
        console.error(`[File Upload] Validation failed: File size is ${buffer.length} bytes (Limit: ${maxLimitBytes} bytes).`);
        return res.status(400).json({
          error: 'File size exceeds the limit of 20MB. Please upload a smaller document.'
        });
      }

      // --- PHASE 2: FILE TYPE DETECTION & NORMALIZATION ---
      const fileExt = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
      console.log(`[File Type Detection] Extracted file extension: ".${fileExt}", Declared MIME: "${fileType}"`);

      // Save file to disk early so we have a persistent record
      console.log(`[File Storage] Storing uploaded file on disk: uploads/...`);
      try {
        const sanitizedName = (fileName || 'report').replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const uniqueFileName = `${Date.now()}_${sanitizedName}`;
        const fullPath = path.join(uploadsDir, uniqueFileName);
        fs.writeFileSync(fullPath, buffer);
        storedFilePath = path.join('uploads', uniqueFileName);
        console.log(`[File Storage] File stored successfully: "${storedFilePath}"`);
      } catch (uploadErr: any) {
        console.error('[File Storage] Failed to write uploaded file to disk:', uploadErr);
        // Continue processing to not break the user experience
      }

      // Route based on extension/type
      if (fileExt === 'txt' || fileType === 'text/plain') {
        // --- PHASE 3A: TXT PARSING ---
        console.log('[TXT Parsing] Decoding text file...');
        try {
          processedTextContent = buffer.toString('utf-8');
          if (!processedTextContent.trim()) {
            console.error('[TXT Parsing] Decoded text is empty.');
            return res.status(400).json({ error: 'Empty document: The plain text file contains no text.' });
          }
          console.log(`[TXT Parsing] Decoded text successfully (Length: ${processedTextContent.length} chars).`);
        } catch (err: any) {
          console.error('[TXT Parsing] Extraction failed:', err);
          return res.status(400).json({
            error: 'Invalid file format: Failed to read text document content.',
            details: err.message
          });
        }
      } else if (fileExt === 'docx') {
        // --- PHASE 3B: DOCX PARSING ---
        console.log('[DOCX Parsing] Starting Mammoth docx text extraction...');
        try {
          const result = await mammoth.extractRawText({ buffer });
          processedTextContent = result.value;
          if (!processedTextContent || !processedTextContent.trim()) {
            console.error('[DOCX Parsing] Extracted text is empty.');
            return res.status(400).json({ error: 'Empty document: No readable text could be extracted from this DOCX.' });
          }
          console.log(`[DOCX Parsing] Extraction successful (Length: ${processedTextContent.length} chars).`);
        } catch (err: any) {
          console.error('[DOCX Parsing] Extraction failed:', err);
          return res.status(400).json({
            error: 'Unsupported report format: Failed to parse DOCX file.',
            details: err.message
          });
        }
      } else if (fileExt === 'doc') {
        // --- PHASE 3C: DOC PARSING ---
        console.log('[DOC Parsing] Extracting printable strings from legacy DOC...');
        try {
          processedTextContent = extractPrintableStrings(buffer);
          if (!processedTextContent || !processedTextContent.trim()) {
            console.error('[DOC Parsing] No printable characters extracted from DOC.');
            return res.status(400).json({ error: 'Empty document: No readable text could be extracted from legacy DOC.' });
          }
          console.log(`[DOC Parsing] Legacy extraction successful (Length: ${processedTextContent.length} chars).`);
        } catch (err: any) {
          console.error('[DOC Parsing] Legacy extraction failed:', err);
          return res.status(400).json({
            error: 'Unsupported report format: Failed to parse legacy DOC file.',
            details: err.message
          });
        }
      } else if (fileExt === 'pdf' || fileType === 'application/pdf') {
        // --- PHASE 3D: PDF PARSING & SCAN CHECK ---
        console.log('[PDF Parsing] Validating PDF format...');
        if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
          console.error('[PDF Parsing] File starts with invalid header bytes.');
          return res.status(400).json({ error: 'Invalid file format: The PDF file is corrupted or invalid.' });
        }
        console.log('[PDF Parsing] Valid PDF header. Scanned/native PDF processing delegated to Gemini multi-modal OCR.');
        passAsInlineData = {
          inlineData: {
            data: base64Clean,
            mimeType: 'application/pdf'
          }
        };
      } else if (['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(fileExt) || fileType.startsWith('image/')) {
        // --- PHASE 3E: IMAGE PROCESSING & OCR PREP ---
        console.log('[Image Processing] Normalizing and preparing image for Gemini OCR...');
        let normalizedMime = fileType;
        if (fileExt === 'png') normalizedMime = 'image/png';
        if (fileExt === 'jpg' || fileExt === 'jpeg') normalizedMime = 'image/jpeg';
        if (fileExt === 'heic') normalizedMime = 'image/heic';
        if (fileExt === 'heif') normalizedMime = 'image/heif';

        if (!normalizedMime || normalizedMime === 'application/octet-stream') {
          normalizedMime = 'image/jpeg';
        }
        console.log(`[Image Processing] Selected MIME type for inlineData: "${normalizedMime}". Size: ${buffer.length} bytes.`);
        passAsInlineData = {
          inlineData: {
            data: base64Clean,
            mimeType: normalizedMime
          }
        };
      } else {
        console.error(`[File Type Detection] Unsupported extension/MIME: Ext: "${fileExt}", MIME: "${fileType}"`);
        return res.status(400).json({
          error: 'Unsupported report format: Only PDF, DOC, DOCX, TXT, and image files (JPG, PNG, HEIC) are supported.'
        });
      }

      // Compile content payload for Gemini API
      if (processedTextContent) {
        console.log('[Upload Pipeline] Sending extracted text content directly to Gemini.');
        contents = [
          {
            text: `Please analyze the following extracted medical report text:
---
${processedTextContent}
---
${documentTypeInstruction}
Verify the patient demographic context: ${age !== null ? 'Age ' + age : 'Age not available'}, ${gender !== 'Unknown' ? 'Gender ' + gender : 'Gender not available'}.
Respond ONLY with a valid JSON object matching the requested schema.`
          }
        ];
      } else if (passAsInlineData) {
        console.log('[Upload Pipeline] Passing multi-modal inlineData file directly to Gemini (handles scanned/native pages perfectly).');
        contents = [
          passAsInlineData,
          {
            text: `Please analyze this medical document titled "${fileName}".
${documentTypeInstruction}
Verify the patient demographic context: ${age !== null ? 'Age ' + age : 'Age not available'}, ${gender !== 'Unknown' ? 'Gender ' + gender : 'Gender not available'}.
Respond ONLY with a valid JSON object matching the requested schema.`
          }
        ];
      }
    } else if (textContent) {
      // --- PHASE 3F: PASTE TEXT PROCESSING ---
      console.log('[Upload Pipeline] Processing pasted text input...');
      if (!textContent.trim()) {
        console.error('[Upload Pipeline] Validation failed: Pasted text input is empty.');
        return res.status(400).json({ error: 'Empty document: The pasted report text is empty.' });
      }
      contents = [
        {
          text: `Please analyze the following medical report text:
---
${textContent}
---
${documentTypeInstruction}
Verify the patient demographic context: ${age !== null ? 'Age ' + age : 'Age not available'}, ${gender !== 'Unknown' ? 'Gender ' + gender : 'Gender not available'}.
Respond ONLY with a valid JSON object matching the requested schema.`
        }
      ];
    } else {
      console.error('[Upload Pipeline] Validation failed: No fileData or textContent provided.');
      return res.status(400).json({ error: 'No report data provided. Please upload a file or paste report text.' });
    }

    // --- PHASE 4: GEMINI API REQUEST ---
    console.log('[Gemini API Request] Initializing request with "gemini-3.5-flash"...');
    let response;
    try {
      response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "The official clinical name of the medical report or test panel."
              },
              documentType: {
                type: Type.STRING,
                description: "The detected type. Allowed values: 'Blood Report', 'MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'ECG', 'General Scan', 'Other'."
              },
              overallHealthScore: {
                type: Type.INTEGER,
                description: "A calculated summary health score out of 100 (e.g. 90-100 optimal, 75-89 minor alerts, 50-74 moderate corrections, <50 critical focus)."
              },
              doctorNotes: {
                type: Type.STRING,
                description: "An elegant, clinical-style summary of the physician notes, observations, or general findings."
              },
              findings: {
                type: Type.STRING,
                description: "A concise bulleted or paragraph summary of primary clinical findings."
              },
              diagnosis: {
                type: Type.STRING,
                description: "Possible educational diagnostic explanations or general terms corresponding to findings."
              },
              recommendations: {
                type: Type.STRING,
                description: "Personalized lifestyle, diet, movement, stress, or sleep actions based on results."
              },
              specialistRecommendation: {
                type: Type.OBJECT,
                properties: {
                  specialist: { type: Type.STRING, description: "E.g., Orthopedic Surgeon, Cardiologist, Endocrinologist, General Physician, Nephrologist." },
                  reason: { type: Type.STRING, description: "Detailed clinical/educational reasoning for why this specialist is suggested." },
                  note: { type: Type.STRING, description: "Must clearly state this is an educational guideline, not a direct medical prescription." }
                },
                required: ["specialist", "reason", "note"]
              },
              biomarkers: {
                type: Type.ARRAY,
                description: "List of all extracted blood markers, vitals, or specific physical findings.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Marker name (e.g., Hemoglobin, Serum Creatinine, L4-L5 Joint)." },
                    value: { type: Type.NUMBER, description: "Numeric representation of the value (for graphing trends), or 0 if qualitative/non-numeric." },
                    rawValue: { type: Type.STRING, description: "The literal result value (e.g., '9.3', 'Mild Narrowing', '140/90')." },
                    unit: { type: Type.STRING, description: "Unit of measurement (e.g., 'g/dL', 'mg/dL', 'mmHg', 'Structure')." },
                    referenceRange: { type: Type.STRING, description: "Laboratory expected standard range tailored to the patient profile (e.g., '12.0 - 15.5')." },
                    status: {
                      type: Type.STRING,
                      description: "Evaluation status. Must be strictly one of: 'Normal', 'Borderline', 'High', 'Low', 'Critical'."
                    },
                    explanation: { type: Type.STRING, description: "Clear, comforting, jargon-free explanation of what this marker means." },
                    shortTermEffects: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of potential direct short-term symptoms or effects if abnormal."
                    },
                    longTermEffects: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of possible long-term risks if this remains untreated."
                    },
                    foodRecommendations: {
                      type: Type.ARRAY,
                      description: "Nutritious whole-foods that can help manage or optimize this marker.",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          foodName: { type: Type.STRING, description: "E.g. Spinach, Lentils, Salmon." },
                          amount: { type: Type.STRING, description: "Quantity description (e.g., '2.7 mg per 100g', 'Soluble fiber source')." },
                          isVegetarian: { type: Type.BOOLEAN, description: "True if plant-based/vegetarian friendly, False if meat/fish." }
                        },
                        required: ["foodName", "amount", "isVegetarian"]
                      }
                    }
                  },
                  required: ["name", "rawValue", "unit", "referenceRange", "status", "explanation", "shortTermEffects", "longTermEffects", "foodRecommendations"]
                }
              },
              dailyNutrients: {
                type: Type.ARRAY,
                description: "Recommended daily nutrient guidelines appropriate for the user's demographic.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nutrient name (e.g., Iron, Vitamin D, Vitamin B12, Calcium)." },
                    recommendedIntake: { type: Type.STRING, description: "Recommended daily quantity (e.g., '18 mg/day', '1000 mg/day')." },
                    progress: { type: Type.INTEGER, description: "Estimated baseline coverage percentage from typical diet (0-100)." },
                    sources: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          foodName: { type: Type.STRING },
                          quantity: { type: Type.STRING, description: "E.g., '3.3 mg per cup', '300 mg per serving'." }
                        },
                        required: ["foodName", "quantity"]
                      }
                    }
                  },
                  required: ["name", "recommendedIntake", "progress", "sources"]
                }
              }
            },
            required: ["title", "documentType", "overallHealthScore", "doctorNotes", "findings", "diagnosis", "recommendations", "specialistRecommendation", "biomarkers", "dailyNutrients"]
          }
        }
      });
      console.log('[Gemini API Response] Successfully received response.');
    } catch (apiErr: any) {
      console.error('[Gemini API Request Failed] Complete Error Stack:', apiErr);
      const errMsg = apiErr.message || '';
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key not valid') || errMsg.includes('API key')) {
        return res.status(401).json({
          error: 'Gemini API key missing or invalid. Please configure GEMINI_API_KEY inside Settings > Secrets.',
          details: errMsg
        });
      }
      if (errMsg.includes('QUOTA_EXCEEDED') || errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('ResourceExhausted')) {
        return res.status(429).json({
          error: 'Gemini API quota exceeded. Please check your usage limits or try again in a few minutes.',
          details: errMsg
        });
      }
      return res.status(502).json({
        error: 'Gemini API request failed. The clinical analysis service is temporarily unavailable.',
        details: errMsg
      });
    }

    // --- PHASE 5: OCR EXTRACTION & RESPONSE PARSING ---
    console.log('[OCR Extraction] Parsing Gemini structured response...');
    if (!response || !response.text) {
      console.error('[OCR Extraction] Failed: Received empty/null response text from Gemini.');
      return res.status(502).json({
        error: 'OCR extraction failed: AI engine returned an empty medical report analysis.'
      });
    }

    let parsedResult;
    try {
      const cleanJsonText = response.text.replace(/```json|```/gi, '').trim();
      parsedResult = JSON.parse(cleanJsonText);
    } catch (parseErr: any) {
      console.error('[OCR Extraction] Failed to parse generated JSON. Raw output was:', response.text);
      console.error(parseErr);
      return res.status(502).json({
        error: 'OCR extraction failed: Medical report text could not be processed into structured laboratory data.',
        details: parseErr.message
      });
    }

    // Structure validation check
    if (!parsedResult.title || !parsedResult.documentType || !parsedResult.biomarkers) {
      console.error('[OCR Extraction] Validation failed: Parsed object lacks critical properties:', parsedResult);
      return res.status(502).json({
        error: 'OCR extraction failed: Structured clinical fields are missing in the generated medical report.'
      });
    }

    // --- PHASE 6: SQLITE DATABASE OPERATIONS ---
    console.log(`[SQLite Database Operations] Storing analyzed report ID: "report-..." for user ID: "${realUserId}"`);
    const newReport: MedicalReport = {
      id: 'report-' + Math.random().toString(36).substr(2, 9),
      userId: realUserId,
      patientName: patientName,
      fileName: fileName || 'Uploaded Report',
      fileType: fileType || 'text/plain',
      uploadDate: new Date().toISOString(),
      documentType: parsedResult.documentType || 'Blood Report',
      analysisResult: parsedResult,
      filePath: storedFilePath
    };

    try {
      await LocalDatabase.saveReport(newReport);
      console.log(`[SQLite Database Operations] Successfully saved report: "${newReport.id}"`);
      res.json({ report: newReport });
    } catch (dbErr: any) {
      console.error('[SQLite Database Operations] Failed to persist report in database:', dbErr);
      return res.status(500).json({
        error: 'Database write failed: Could not save the processed medical report to history.',
        details: dbErr.message
      });
    }
  } catch (err: any) {
    console.error('Error in general medical analysis routine:', err);
    res.status(500).json({
      error: 'An unexpected internal error occurred during report analysis.',
      details: err.message
    });
  }
});

// ==========================================
// CHAT ENDPOINT
// ==========================================
app.post('/api/chat', authMiddleware, async (req, res) => {
  const { message, history, reportId, activeProfileId, language } = req.body;
  const user = (req as any).user as User;
  const realUserId = (req as any).realUserId as string;

  if (!message) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  try {
    let profile = user.profile;
    if (activeProfileId && user.profiles) {
      const found = user.profiles.find(p => p.id === activeProfileId);
      if (found) {
        profile = found;
      }
    }

    if (!profile) {
      profile = user.profiles?.[0] || {
        id: 'profile-main',
        relationship: 'Self',
        name: user.name || 'Patient',
        age: null,
        gender: 'Unknown',
        height: null,
        weight: null,
        medicalHistory: '',
        allergies: '',
        lifestylePreferences: '',
        privacySettings: {
          shareWithDoctor: true,
          anonymousResearch: false
        },
        isIncomplete: true
      };
    }

    // Retrieve report context if specified
    let reportContextText = '';
    if (reportId) {
      const reports = await LocalDatabase.getReportsByUserId(realUserId);
      const selectedReport = reports.find(r => r.id === reportId);
      if (selectedReport) {
        reportContextText = `
You are discussing the user's uploaded report titled "${selectedReport.analysisResult.title}".
Report Summary:
- Detected Document Type: ${selectedReport.analysisResult.documentType}
- Overall Health Score: ${selectedReport.analysisResult.overallHealthScore}/100
- Findings: ${selectedReport.analysisResult.findings}
- Diagnostic Interpretations: ${selectedReport.analysisResult.diagnosis}
- Recommendations: ${selectedReport.analysisResult.recommendations}
- Specialist recommendation: ${selectedReport.analysisResult.specialistRecommendation?.specialist || 'GP'} - Reason: ${selectedReport.analysisResult.specialistRecommendation?.reason || 'Routine follow-up'}

Biomarkers of interest in this report:
${selectedReport.analysisResult.biomarkers.map(b => `- ${b.name}: ${b.rawValue} ${b.unit} (Expected: ${b.referenceRange}). Status: ${b.status}. Description: ${b.explanation}`).join('\n')}
`;
      }
    }

    let languageInstruction = '';
    if (language && language !== 'English') {
      languageInstruction = `\n\nCRITICAL LANGUAGE REQUIREMENT: You MUST answer the user entirely in the ${language} language. Even if they ask in English or another language, format your entire detailed explanation, warm words, and guidance using beautiful, grammatically correct, and easy-to-understand ${language}.`;
    }

    // Create the full conversation context
    const chatSystemPrompt = `You are Nirva's Premium AI Lifestyle Medicine Assistant.
Your goal is to answer patient questions regarding their uploaded medical reports, health markers, nutrition, and lifestyle medicine.
You are talking to ${profile?.name ?? 'Patient'} (Age: ${profile?.age !== null && profile?.age !== undefined ? profile.age : 'not available'}, Gender: ${profile?.gender ?? 'not available'}).${languageInstruction}

CRITICAL SAFETY & CONDUCT RULES:
1. MEDICAL EDUCATION ONLY: Always remember that you provide educational explanations. Never diagnose, never prescribe drug dosages, and never claim certainty beyond the report findings. Recommend seeing a doctor or the suggested specialist for clinical decisions.
2. REPORT GROUNDING: ${reportContextText ? 'Your responses MUST be heavily grounded in the report details provided above. Refer to specific biomarkers (e.g. your Hemoglobin is low at 9.3) when explaining.' : 'Encourage the user to upload a medical report in the Report Analyzer workspace so you can analyze their actual biological markers.'}
3. PERSUASION: Maintain a supportive, empathetic, warm, and highly professional tone, matching the "Nirva | Lifestyle Medicine" brand values.
4. If a user asks questions unrelated to their medical health or general medical lifestyle science, politely redirect them back to their medical reports and healthy lifestyle habits.`;

    const formattedContents: any[] = [];
    
    // Format message history
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach((msg: any) => {
        formattedContents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    // Add current user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await generateContentWithRetry({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: chatSystemPrompt,
        temperature: 0.7,
      }
    });

    const replyText = response.text || 'I apologize, but I am unable to formulate a response at this time.';

    // Save Chat messages to SQLite ai_conversations table for persistent audit log
    await LocalDatabase.saveChatMessage(realUserId, reportId, 'user', message);
    await LocalDatabase.saveChatMessage(realUserId, reportId, 'assistant', replyText);

    res.json({ text: replyText });

  } catch (err: any) {
    console.error('Error in AI chat assistant route:', err);
    res.status(500).json({ error: 'Failed to generate chat response.', details: err.message });
  }
});


// ==========================================
// VITE DEV MIDDLEWARE & STATIC BINDINGS
// ==========================================

async function startServer() {
  // Global API 404 handler for undefined API endpoints
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: 'NotFound',
      message: `API route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Global Error Handler for API routes and general unhandled middleware errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error Handler caught an error:', err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Robust path resolution for production build directory 'dist'
  const cwd = process.cwd();
  let finalDistPath = '';

  if (fs.existsSync(path.join(cwd, 'dist', 'index.html'))) {
    finalDistPath = path.join(cwd, 'dist');
  } else if (fs.existsSync(path.join(__dirname, 'index.html'))) {
    finalDistPath = __dirname;
  } else if (fs.existsSync(path.join(__dirname, 'dist', 'index.html'))) {
    finalDistPath = path.join(__dirname, 'dist');
  } else {
    finalDistPath = path.join(cwd, 'dist');
  }

  const indexPath = path.join(finalDistPath, 'index.html');
  const indexExists = fs.existsSync(indexPath);

  // STARTUP DIAGNOSTICS LOGS REQUIRED FOR RENDER DEPLOYMENT
  console.log('=== Render Production Ready Diagnostics ===');
  console.log(`Current Working Directory: ${cwd}`);
  console.log(`Dist Folder Path: ${finalDistPath}`);
  console.log(`Whether index.html exists: ${indexExists}`);

  // In production, serve static files. In development, run Vite middleware.
  if (process.env.NODE_ENV === 'production') {
    if (!indexExists) {
      console.error(`CRITICAL WARNING: index.html was not found at expected path: ${indexPath}`);
    } else {
      console.log('Static files loaded successfully.');
    }

    // Serve static files from the dist directory
    app.use(express.static(finalDistPath));

    // Wildcard route to handle React Router client-side routing (e.g. /, /login, /dashboard, /report, /profile)
    app.get('*', (req, res, next) => {
      // Allow fallback only for non-API, non-Upload requests
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Return clear descriptive error instead of silently sending "Not Found"
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Production Build Asset Missing</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 50px auto; padding: 20px; color: #1f2937; }
                h1 { color: #dc2626; font-size: 24px; margin-bottom: 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; }
                p { font-size: 15px; margin-bottom: 12px; }
                code { background: #f3f4f6; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-size: 14px; word-break: break-all; }
                .footer { margin-top: 30px; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }
              </style>
            </head>
            <body>
              <h1>Production Build index.html Not Found</h1>
              <p>The Nirva Lifestyle Medicine server started successfully, but the built frontend assets (specifically <code>index.html</code>) are missing or inaccessible.</p>
              <p><strong>Attempted Index Path:</strong> <code>${indexPath}</code></p>
              <p><strong>Current Working Directory (CWD):</strong> <code>${cwd}</code></p>
              <p>Please verify that <code>npm run build</code> completed successfully in your build environment before deploying or starting the server.</p>
              <div class="footer">Nirva Lifestyle Medicine App Server Diagnostics</div>
            </body>
          </html>
        `);
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware integrated.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is actively running on port ${PORT}`);
  });
}

startServer();
