import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenAI, Type } from '@google/genai';
import { LocalDatabase } from './src/db/local_db';
import { User, MedicalReport, UserProfile } from './src/types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up larger limits for base64 file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Middleware to extract and verify Bearer JWT Token or legacy ID
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

    // Generate JWT token containing the actual relational userId
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    // Swap the ID to be the token for frontend persistence compatibility
    newUser.id = token;

    res.json({ message: 'Registration successful', user: newUser });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal registration failure.', details: err.message });
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

// ==========================================
// AI REPORT ANALYZER ENDPOINT
// ==========================================
app.post('/api/analyze', authMiddleware, async (req, res) => {
  const user = (req as any).user as User;
  const realUserId = (req as any).realUserId as string;
  const { fileData, fileName, fileType, textContent, targetProfileId, language } = req.body;

  if (!geminiApiKey) {
    return res.status(500).json({
      error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to the Settings > Secrets panel.'
    });
  }

  try {
    let profile = user.profile;
    if (targetProfileId && user.profiles) {
      const found = user.profiles.find(p => p.id === targetProfileId);
      if (found) {
        profile = found;
      }
    }
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
1. CUSTOM REFERENCE RANGES: Customize your evaluation of normal, borderline, low, high, and critical ranges based on the patient's Age (${profile.age}) and Gender (${profile.gender}). Specify standard references or laboratory-specific references if visible.
2. MEDICAL TERMINOLOGY: Avoid medical jargon in the final summaries. For example, explain "Microcytic Hypochromic Anemia" as: "Your blood has lower hemoglobin than expected, meaning less oxygen may reach your body's tissues. This can cause tiredness, weakness, or dizziness."
3. SHORT-TERM EFFECTS: Detail concrete immediate symptoms or short-term effects for any borderline/low/high/critical biomarker.
4. LONG-TERM CONSEQUENCES: Provide possible untreated long-term health consequences, distinguishing clearly between general possibilities and confirmed diagnostic findings.
5. FOOD RECOMMENDATIONS: For abnormal biomarkers, offer specific vegetarian and non-vegetarian foods with detailed nutrient values or descriptive benefits (e.g., "Spinach: 2.7 mg per 100g").
6. DAILY NUTRIENTS: Offer recommended daily intakes suitable for ${profile.age}yo ${profile.gender} for relevant elements (such as Iron, Vitamin D, Calcium, Magnesium, Protein, Fiber, etc.), lists of whole-food sources, and progress estimates.
7. CLINICAL DISCLAIMER: Suggest appropriate specialists for further discussion (e.g., Nephrologist for kidney, Hematologist/GP for anemia, Orthopedic for bones/joints) and include an explicit note that this is educational.`;

    if (fileData) {
      // It's a file upload (PDF/Image)
      const base64Data = fileData.includes(';base64,') ? fileData.split(';base64,')[1] : fileData;
      contents = [
        {
          inlineData: {
            data: base64Data,
            mimeType: fileType || 'application/pdf'
          }
        },
        {
          text: `Please analyze this medical document titled "${fileName}".
${documentTypeInstruction}
Verify the patient demographic context: Age ${profile.age}, Gender ${profile.gender}.
Respond ONLY with a valid JSON object matching the requested schema.`
        }
      ];
    } else if (textContent) {
      // Text-only report (such as copied text)
      contents = [
        {
          text: `Please analyze the following medical report text:
---
${textContent}
---
${documentTypeInstruction}
Verify the patient demographic context: Age ${profile.age}, Gender ${profile.gender}.
Respond ONLY with a valid JSON object matching the requested schema.`
        }
      ];
    } else {
      return res.status(400).json({ error: 'No report data provided. Please upload a file or paste report text.' });
    }

    // Call Gemini API using modern @google/genai syntax
    const response = await ai.models.generateContent({
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

    if (!response.text) {
      throw new Error('Empty response from AI analysis engine.');
    }

    const cleanJsonText = response.text.replace(/```json|```/gi, '').trim();
    const parsedResult = JSON.parse(cleanJsonText);

    // Save the report to SQLite database under realUserId
    const newReport: MedicalReport = {
      id: 'report-' + Math.random().toString(36).substr(2, 9),
      userId: realUserId,
      patientName: profile.name,
      fileName: fileName || 'Uploaded Report',
      fileType: fileType || 'text/plain',
      uploadDate: new Date().toISOString(),
      documentType: parsedResult.documentType || 'Blood Report',
      analysisResult: parsedResult
    };

    await LocalDatabase.saveReport(newReport);
    res.json({ report: newReport });

  } catch (err: any) {
    console.error('Error in medical analysis route:', err);
    res.status(500).json({
      error: 'Failed to analyze the document. Please ensure the file is legible and contains medical report data.',
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
You are talking to ${profile.name} (Age: ${profile.age}, Gender: ${profile.gender}).${languageInstruction}

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

    const response = await ai.models.generateContent({
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware integrated.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static asset distribution loaded.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is actively running on port ${PORT}`);
  });
}

startServer();
