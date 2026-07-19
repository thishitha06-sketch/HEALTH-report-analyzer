import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { User, MedicalReport, UserProfile, Biomarker, NutrientRequirement } from '../types';

// Establish the SQLite database file in the project workspace root
const dbPath = path.join(process.cwd(), 'medical_ai.db');
const db = new Database(dbPath);

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Ensure uploads folder exists automatically
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export class LocalDatabase {
  private static seeded = false;

  private static initDatabase() {
    if (this.seeded) return;

    // 1. Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        relationship TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        height REAL NOT NULL,
        weight REAL NOT NULL,
        medical_history TEXT,
        allergies TEXT,
        lifestyle_preferences TEXT,
        share_with_doctor INTEGER NOT NULL, -- 0 or 1
        anonymous_research INTEGER NOT NULL, -- 0 or 1
        is_main INTEGER NOT NULL, -- 0 or 1
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS medical_reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        patient_name TEXT,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        upload_date TEXT NOT NULL,
        document_type TEXT NOT NULL,
        title TEXT NOT NULL,
        overall_health_score INTEGER NOT NULL,
        doctor_notes TEXT,
        findings TEXT,
        diagnosis TEXT,
        recommendations TEXT,
        specialist_name TEXT,
        specialist_reason TEXT,
        specialist_note TEXT,
        file_path TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS report_biomarkers (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        raw_value TEXT NOT NULL,
        unit TEXT NOT NULL,
        reference_range TEXT NOT NULL,
        status TEXT NOT NULL,
        explanation TEXT NOT NULL,
        short_term_effects TEXT NOT NULL, -- JSON string array
        long_term_effects TEXT NOT NULL, -- JSON string array
        food_recommendations TEXT NOT NULL, -- JSON FoodRecommendation array
        FOREIGN KEY(report_id) REFERENCES medical_reports(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS report_nutrients (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        name TEXT NOT NULL,
        recommended_intake TEXT NOT NULL,
        progress REAL NOT NULL,
        sources TEXT NOT NULL, -- JSON NutrientSource array
        FOREIGN KEY(report_id) REFERENCES medical_reports(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        report_id TEXT,
        role TEXT NOT NULL, -- 'user' or 'assistant'
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS health_timeline (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        parameter TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        report_date TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_medical_reports_user ON medical_reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_report_biomarkers_report ON report_biomarkers(report_id);
      CREATE INDEX IF NOT EXISTS idx_report_nutrients_report ON report_nutrients(report_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_health_timeline_user_param ON health_timeline(user_id, parameter);
    `);

    // Safe migration to add file_path to medical_reports if table was created in earlier turn without it
    try {
      db.prepare("ALTER TABLE medical_reports ADD COLUMN file_path TEXT").run();
    } catch (err) {
      // Column already exists or table doesn't exist
    }

    // Safe migration to add is_incomplete to user_profiles
    try {
      db.prepare("ALTER TABLE user_profiles ADD COLUMN is_incomplete INTEGER DEFAULT 0").run();
    } catch (err) {
      // Column already exists or table doesn't exist
    }

    // Safe migration to add activity_level and pregnancy_status
    try {
      db.prepare("ALTER TABLE user_profiles ADD COLUMN activity_level TEXT DEFAULT 'Sedentary'").run();
    } catch (err) {
      // Column already exists
    }

    try {
      db.prepare("ALTER TABLE user_profiles ADD COLUMN pregnancy_status TEXT DEFAULT 'Not Applicable'").run();
    } catch (err) {
      // Column already exists
    }

    // 2. Pre-seed high-quality mock data if database is empty
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (usersCount.count === 0) {
      console.log("SQLite database is empty. Pre-seeding high-quality mock medical data...");

      // Default Emily Watson password is 'password123'
      const hashedPw = bcrypt.hashSync('password123', 10);
      const userId = 'user-123';
      const email = 'thishitha06@gmail.com';
      const name = 'Emily Watson';
      const createdAt = new Date('2026-06-01').toISOString();

      // Seed main user
      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, email, name, hashedPw, createdAt);

      // Seed user profile
      const profileId = 'profile-main';
      db.prepare(`
        INSERT INTO user_profiles (
          id, user_id, relationship, name, age, gender, height, weight,
          medical_history, allergies, lifestyle_preferences,
          share_with_doctor, anonymous_research, is_main
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        profileId,
        userId,
        'Self',
        name,
        28,
        'Female',
        168,
        62,
        'Occasional mild seasonal allergies.',
        'Penicillin',
        'Vegetarian with occasional egg/dairy intake. Enjoys jogging twice a week.',
        1, // shareWithDoctor
        0, // anonymousResearch
        1  // is_main
      );

      // Seed Report 1 (Blood Report)
      const report1Id = 'report-1';
      db.prepare(`
        INSERT INTO medical_reports (
          id, user_id, patient_name, file_name, file_type, upload_date, document_type,
          title, overall_health_score, doctor_notes, findings, diagnosis, recommendations,
          specialist_name, specialist_reason, specialist_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        report1Id,
        userId,
        name,
        'blood_test_june_2026.pdf',
        'application/pdf',
        '2026-06-15T10:30:00Z',
        'Blood Report',
        'Routine Complete Blood Count & Vitamin Panel',
        72,
        'Patient reports mild, unexplained fatigue during afternoon hours. Biomarkers indicate Moderate Microcytic Anemia due to low Hemoglobin. Vitamin D levels are also borderline-low.',
        'Primary finding is low Hemoglobin at 9.3 g/dL. Mean Corpuscular Volume (MCV) is slightly reduced (Microcytic). Serum Vitamin D (25-OH) is in the borderline range at 22 ng/mL. Other parameters, including Kidney and Liver function markers, fall within normal expected limits.',
        'Mild Iron Deficiency Anemia & Borderline Vitamin D Deficiency',
        'Increase intake of iron-rich foods (such as lentils, spinach, pumpkin seeds) paired with Vitamin C to enhance absorption. Take daily safe sun exposure for 15 minutes. Follow up with your doctor for serum ferritin testing and consideration of mild supplementation. Monitor progress in 6-8 weeks.',
        'General Physician or Internal Medicine Specialist',
        'Low Hemoglobin levels indicate mild anemia, which is best evaluated and managed by a primary care physician to rule out underlying iron storage depletion.',
        'This recommendation is for educational guidance only and does not replace professional clinical evaluation.'
      );

      // Seed Report 1 Biomarkers
      const biomarkersR1 = [
        {
          id: 'b1-1',
          name: 'Hemoglobin',
          value: 9.3,
          rawValue: '9.3',
          unit: 'g/dL',
          referenceRange: '12.0 – 15.5',
          status: 'Low',
          explanation: 'Your blood has lower hemoglobin than expected, meaning less oxygen may reach your body\'s tissues. This can cause tiredness, weakness, or dizziness.',
          shortTermEffects: ['Fatigue', 'Weakness', 'Headache', 'Dizziness', 'Reduced stamina'],
          longTermEffects: ['Heart strain', 'Reduced immunity', 'Cognitive lag', 'Reduced physical performance'],
          foodRecommendations: [
            { foodName: 'Spinach', amount: '2.7 mg per 100g', isVegetarian: true },
            { foodName: 'Lentils', amount: '3.3 mg per 100g', isVegetarian: true },
            { foodName: 'Pumpkin Seeds', amount: '8.8 mg per 100g', isVegetarian: true },
            { foodName: 'Chicken Liver', amount: '9.0 mg per 100g', isVegetarian: false }
          ]
        },
        {
          id: 'b1-2',
          name: 'Vitamin D3 (25-Hydroxy)',
          value: 22,
          rawValue: '22',
          unit: 'ng/mL',
          referenceRange: '30.0 – 100.0',
          status: 'Low',
          explanation: 'Vitamin D is essential for bone density, immune regulation, and mood. Your level is below the recommended healthy threshold.',
          shortTermEffects: ['Muscle aches', 'Mild bone pain', 'Fatigue', 'Slight mood drops'],
          longTermEffects: ['Osteoporosis risk', 'Reduced muscle strength', 'Weakened immune response'],
          foodRecommendations: [
            { foodName: 'Wild Salmon', amount: '526 IU per 100g', isVegetarian: false },
            { foodName: 'Egg Yolks', amount: '37 IU per large egg', isVegetarian: true },
            { foodName: 'Maitake Mushrooms', amount: '785 IU per 100g', isVegetarian: true }
          ]
        },
        {
          id: 'b1-3',
          name: 'Serum Creatinine',
          value: 0.8,
          rawValue: '0.8',
          unit: 'mg/dL',
          referenceRange: '0.5 – 1.1',
          status: 'Normal',
          explanation: 'Creatinine is a waste product filtered by your kidneys. Your result is well within the healthy, optimal range, indicating solid kidney health.',
          shortTermEffects: [],
          longTermEffects: [],
          foodRecommendations: []
        },
        {
          id: 'b1-4',
          name: 'Fasting Blood Glucose',
          value: 94,
          rawValue: '94',
          unit: 'mg/dL',
          referenceRange: '70.0 – 99.0',
          status: 'Normal',
          explanation: 'Your blood sugar after fasting is optimal. This indicates healthy insulin sensitivity and metabolism at this time.',
          shortTermEffects: [],
          longTermEffects: [],
          foodRecommendations: []
        },
        {
          id: 'b1-5',
          name: 'Total Cholesterol',
          value: 198,
          rawValue: '198',
          unit: 'mg/dL',
          referenceRange: '100.0 – 199.0',
          status: 'Borderline',
          explanation: 'Your total cholesterol is close to the upper limit. While not critical, keeping an eye on healthy fats is advised.',
          shortTermEffects: ['No immediate physical symptoms'],
          longTermEffects: ['Gradual plaque build-up risk', 'Cardiovascular strain over decades'],
          foodRecommendations: [
            { foodName: 'Oat Bran', amount: 'Rich in soluble fiber', isVegetarian: true },
            { foodName: 'Walnuts', amount: 'Source of healthy Omega-3', isVegetarian: true },
            { foodName: 'Olive Oil', amount: 'Monounsaturated fats', isVegetarian: true }
          ]
        }
      ];

      for (const b of biomarkersR1) {
        db.prepare(`
          INSERT INTO report_biomarkers (
            id, report_id, name, value, raw_value, unit, reference_range,
            status, explanation, short_term_effects, long_term_effects, food_recommendations
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          b.id,
          report1Id,
          b.name,
          b.value,
          b.rawValue,
          b.unit,
          b.referenceRange,
          b.status,
          b.explanation,
          JSON.stringify(b.shortTermEffects),
          JSON.stringify(b.longTermEffects),
          JSON.stringify(b.foodRecommendations)
        );

        // Seed Health Timeline from biomarkers
        db.prepare(`
          INSERT INTO health_timeline (id, user_id, parameter, value, unit, report_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          'ht-' + b.id,
          userId,
          b.name,
          b.value,
          b.unit,
          '2026-06-15T10:30:00Z'
        );
      }

      // Seed Report 1 Nutrients
      const nutrientsR1 = [
        {
          id: 'n1-1',
          name: 'Iron',
          recommendedIntake: '18 mg/day',
          progress: 45,
          sources: [
            { foodName: 'Lentils', quantity: '3.3 mg per cup' },
            { foodName: 'Cooked Spinach', quantity: '6.4 mg per cup' }
          ]
        },
        {
          id: 'n1-2',
          name: 'Vitamin D',
          recommendedIntake: '600 IU/day',
          progress: 30,
          sources: [
            { foodName: 'Fortified Almond Milk', quantity: '120 IU per cup' },
            { foodName: 'Mushrooms exposed to UV', quantity: '400 IU per cup' }
          ]
        },
        {
          id: 'n1-3',
          name: 'Calcium',
          recommendedIntake: '1000 mg/day',
          progress: 80,
          sources: [
            { foodName: 'Yogurt', quantity: '300 mg per cup' },
            { foodName: 'Chia Seeds', quantity: '180 mg per oz' }
          ]
        }
      ];

      for (const n of nutrientsR1) {
        db.prepare(`
          INSERT INTO report_nutrients (id, report_id, name, recommended_intake, progress, sources)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          n.id,
          report1Id,
          n.name,
          n.recommendedIntake,
          n.progress,
          JSON.stringify(n.sources)
        );
      }

      // Seed Report 2 (MRI Report)
      const report2Id = 'report-2';
      db.prepare(`
        INSERT INTO medical_reports (
          id, user_id, patient_name, file_name, file_type, upload_date, document_type,
          title, overall_health_score, doctor_notes, findings, diagnosis, recommendations,
          specialist_name, specialist_reason, specialist_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        report2Id,
        userId,
        name,
        'lumbar_mri_report.txt',
        'text/plain',
        '2026-07-02T14:15:00Z',
        'MRI',
        'Lumbar Spine MRI Examination',
        80,
        'MRI of the lumbar spine reveals a mild L4-L5 disc protrusion without significant spinal canal stenosis. Excellent bone density, normal alignment.',
        'Mild narrowing of the disc space at L4-L5 with a small broad-based posterior disc protrusion. No evidence of nerve root impingement or spinal cord compression. Paraspinal muscles are normal in appearance.',
        'Mild L4-L5 Disc Protrusion without Stenosis',
        'Avoid repetitive heavy lifting. Implement core strengthening exercises (Pilates, yoga, core stabilization). Maintain good ergonomic posture during prolonged sitting.',
        'Orthopedic Specialist or Physical Therapist',
        'Mild disc protrusions respond exceptionally well to targeted spinal physical therapy and core stabilization under expert supervision.',
        'This is educational only and not a treatment diagnosis.'
      );

      // Seed Report 2 Biomarkers
      const biomarkersR2 = [
        {
          id: 'b2-1',
          name: 'L4-L5 Disc Space',
          value: 75,
          rawValue: 'Mild Narrowing',
          unit: 'Structure',
          referenceRange: 'Optimal Height',
          status: 'Borderline',
          explanation: 'The disc between your 4th and 5th lumbar vertebrae is slightly compressed. This cushioning material can sometimes cause lower back soreness if loaded heavily.',
          shortTermEffects: ['Mild lower back ache', 'Stiffness after prolonged sitting'],
          longTermEffects: ['Early disc degeneration', 'Potential localized joint stiffness'],
          foodRecommendations: [
            { foodName: 'Bone Broth', amount: 'Rich in collagen', isVegetarian: false },
            { foodName: 'Berries', amount: 'Antioxidants for inflammation', isVegetarian: true },
            { foodName: 'Turmeric', amount: 'Anti-inflammatory curcumin', isVegetarian: true }
          ]
        }
      ];

      for (const b of biomarkersR2) {
        db.prepare(`
          INSERT INTO report_biomarkers (
            id, report_id, name, value, raw_value, unit, reference_range,
            status, explanation, short_term_effects, long_term_effects, food_recommendations
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          b.id,
          report2Id,
          b.name,
          b.value,
          b.rawValue,
          b.unit,
          b.referenceRange,
          b.status,
          b.explanation,
          JSON.stringify(b.shortTermEffects),
          JSON.stringify(b.longTermEffects),
          JSON.stringify(b.foodRecommendations)
        );

        // Seed Health Timeline from biomarkers
        db.prepare(`
          INSERT INTO health_timeline (id, user_id, parameter, value, unit, report_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          'ht-' + b.id,
          userId,
          b.name,
          b.value,
          b.unit,
          '2026-07-02T14:15:00Z'
        );
      }

      console.log("SQLite pre-seeding completed successfully.");
    }

    this.seeded = true;
  }

  private static ensureProfiles(user: User): User {
    if (!user.profile) {
      user.profile = {
        id: 'profile-main',
        relationship: 'Self',
        name: user.name || 'Self',
        age: 30,
        gender: 'Unknown',
        height: null,
        weight: null,
        activityLevel: 'Sedentary',
        pregnancyStatus: 'Not Applicable',
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
    if (!user.profile.id) {
      user.profile.id = 'profile-main';
    }
    if (!user.profile.relationship) {
      user.profile.relationship = 'Self';
    }
    if (!user.profile.activityLevel) {
      user.profile.activityLevel = 'Sedentary';
    }
    if (!user.profile.pregnancyStatus) {
      user.profile.pregnancyStatus = 'Not Applicable';
    }
    if (!user.profiles || user.profiles.length === 0) {
      user.profiles = [user.profile];
    }
    
    user.profiles.forEach((p, idx) => {
      if (!p.id) {
        p.id = idx === 0 ? 'profile-main' : `profile-${Math.random().toString(36).substr(2, 9)}`;
      }
      if (!p.relationship) {
        p.relationship = idx === 0 ? 'Self' : 'Family';
      }
      if (!p.activityLevel) {
        p.activityLevel = 'Sedentary';
      }
      if (!p.pregnancyStatus) {
        p.pregnancyStatus = 'Not Applicable';
      }
      // Calculate completeness dynamically
      p.isIncomplete = !p.age || !p.gender || p.gender === 'Unknown' || !p.height || !p.weight || !p.activityLevel || !p.pregnancyStatus;
    });
    // Set active profile's completeness
    user.profile.isIncomplete = !user.profile.age || !user.profile.gender || user.profile.gender === 'Unknown' || !user.profile.height || !user.profile.weight || !user.profile.activityLevel || !user.profile.pregnancyStatus;
    
    return user;
  }

  // --- Core SQL Helper Methods to map SQLite Rows back to App Types ---
  private static assembleUser(userRow: any, profileRows: any[]): User {
    const profiles: UserProfile[] = profileRows.map(row => {
      const p: UserProfile = {
        id: row.id,
        relationship: row.relationship,
        name: row.name,
        age: row.age === 0 ? null : row.age,
        gender: row.gender || 'Unknown',
        height: (row.height === 0 || row.height === null) ? null : row.height,
        weight: (row.weight === 0 || row.weight === null) ? null : row.weight,
        activityLevel: row.activity_level || 'Sedentary',
        pregnancyStatus: row.pregnancy_status || 'Not Applicable',
        medicalHistory: row.medical_history || '',
        allergies: row.allergies || '',
        lifestylePreferences: row.lifestyle_preferences || '',
        privacySettings: {
          shareWithDoctor: row.share_with_doctor === 1,
          anonymousResearch: row.anonymous_research === 1
        },
        isIncomplete: row.is_incomplete === 1
      };
      // Ensure we dynamically verify is_incomplete as well
      p.isIncomplete = !p.age || !p.gender || p.gender === 'Unknown' || !p.height || !p.weight || !p.activityLevel || !p.pregnancyStatus;
      return p;
    });

    // Main profile is the one marked is_main = 1, or the first one, or self
    let mainProfile = profiles.find((p, idx) => profileRows[idx].is_main === 1) || profiles.find(p => p.relationship === 'Self') || profiles[0];
    if (!mainProfile) {
      mainProfile = {
        id: 'profile-main',
        relationship: 'Self',
        name: userRow.name || 'Self',
        age: 30,
        gender: 'Unknown',
        height: null,
        weight: null,
        activityLevel: 'Sedentary',
        pregnancyStatus: 'Not Applicable',
        medicalHistory: '',
        allergies: '',
        lifestylePreferences: '',
        privacySettings: {
          shareWithDoctor: true,
          anonymousResearch: false
        },
        isIncomplete: true
      };
      profiles.push(mainProfile);
    }

    return {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      profile: mainProfile,
      profiles: profiles,
      createdAt: userRow.created_at
    };
  }

  private static assembleReport(reportRow: any, biomarkerRows: any[], nutrientRows: any[]): MedicalReport {
    const biomarkers: Biomarker[] = biomarkerRows.map(row => ({
      name: row.name,
      value: row.value,
      rawValue: row.raw_value,
      unit: row.unit,
      referenceRange: row.reference_range,
      status: row.status as any,
      explanation: row.explanation,
      shortTermEffects: JSON.parse(row.short_term_effects || '[]'),
      longTermEffects: JSON.parse(row.long_term_effects || '[]'),
      foodRecommendations: JSON.parse(row.food_recommendations || '[]')
    }));

    const dailyNutrients: NutrientRequirement[] = nutrientRows.map(row => ({
      name: row.name,
      recommendedIntake: row.recommended_intake,
      progress: row.progress,
      sources: JSON.parse(row.sources || '[]')
    }));

    return {
      id: reportRow.id,
      userId: reportRow.user_id,
      patientName: reportRow.patient_name || '',
      fileName: reportRow.file_name,
      fileType: reportRow.file_type,
      uploadDate: reportRow.upload_date,
      documentType: reportRow.document_type,
      filePath: reportRow.file_path || undefined,
      analysisResult: {
        title: reportRow.title,
        documentType: reportRow.document_type as any,
        overallHealthScore: reportRow.overall_health_score,
        doctorNotes: reportRow.doctor_notes || '',
        findings: reportRow.findings || '',
        diagnosis: reportRow.diagnosis || '',
        recommendations: reportRow.recommendations || '',
        specialistRecommendation: {
          specialist: reportRow.specialist_name || '',
          reason: reportRow.specialist_reason || '',
          note: reportRow.specialist_note || ''
        },
        biomarkers: biomarkers,
        dailyNutrients: dailyNutrients
      }
    };
  }

  // --- Public Operations implementing LocalDatabase Class Interface ---

  public static async getUsers(): Promise<User[]> {
    this.initDatabase();
    const userRows = db.prepare('SELECT * FROM users').all() as any[];
    const users: User[] = [];

    for (const row of userRows) {
      const profiles = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').all(row.id) as any[];
      users.push(this.assembleUser(row, profiles));
    }
    return users;
  }

  public static async getUserById(id: string): Promise<User | undefined> {
    this.initDatabase();
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!userRow) return undefined;

    const profiles = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').all(id) as any[];
    return this.assembleUser(userRow, profiles);
  }

  public static async getUserByEmail(email: string): Promise<User | undefined> {
    this.initDatabase();
    const userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
    if (!userRow) return undefined;

    const profiles = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').all(userRow.id) as any[];
    return this.assembleUser(userRow, profiles);
  }

  public static async saveUser(user: User) {
    this.initDatabase();
    // Use transaction to ensure full atomicity
    const transaction = db.transaction(() => {
      // 1. Insert or Replace User
      db.prepare(`
        INSERT INTO users (id, email, name, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name
      `).run(user.id, user.email.toLowerCase(), user.name, user.createdAt || new Date().toISOString());

      // 2. Ensure Profiles list is complete
      const cleanedUser = this.ensureProfiles(user);

      // 3. Keep existing profiles list or update them
      if (cleanedUser.profiles) {
        for (const p of cleanedUser.profiles) {
          const isMain = cleanedUser.profile.id === p.id ? 1 : 0;
          db.prepare(`
            INSERT INTO user_profiles (
              id, user_id, relationship, name, age, gender, height, weight,
              medical_history, allergies, lifestyle_preferences, share_with_doctor, anonymous_research, is_main, is_incomplete,
              activity_level, pregnancy_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              relationship = excluded.relationship,
              name = excluded.name,
              age = excluded.age,
              gender = excluded.gender,
              height = excluded.height,
              weight = excluded.weight,
              medical_history = excluded.medical_history,
              allergies = excluded.allergies,
              lifestyle_preferences = excluded.lifestyle_preferences,
              share_with_doctor = excluded.share_with_doctor,
              anonymous_research = excluded.anonymous_research,
              is_main = excluded.is_main,
              is_incomplete = excluded.is_incomplete,
              activity_level = excluded.activity_level,
              pregnancy_status = excluded.pregnancy_status
          `).run(
            p.id,
            cleanedUser.id,
            p.relationship || 'Self',
            p.name,
            p.age ?? 0,
            p.gender || 'Unknown',
            p.height ?? 0,
            p.weight ?? 0,
            p.medicalHistory || '',
            p.allergies || '',
            p.lifestylePreferences || '',
            p.privacySettings?.shareWithDoctor ? 1 : 0,
            p.privacySettings?.anonymousResearch ? 1 : 0,
            isMain,
            p.isIncomplete ? 1 : 0,
            p.activityLevel || 'Sedentary',
            p.pregnancyStatus || 'Not Applicable'
          );
        }
      }
    });

    transaction();
  }

  // Save User along with their password hash
  public static async saveUserWithPassword(user: User, passwordHash: string) {
    this.initDatabase();
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          password_hash = excluded.password_hash
      `).run(user.id, user.email.toLowerCase(), user.name, passwordHash, user.createdAt || new Date().toISOString());

      const cleanedUser = this.ensureProfiles(user);
      if (cleanedUser.profiles) {
        for (const p of cleanedUser.profiles) {
          const isMain = cleanedUser.profile.id === p.id ? 1 : 0;
          db.prepare(`
            INSERT INTO user_profiles (
              id, user_id, relationship, name, age, gender, height, weight,
              medical_history, allergies, lifestyle_preferences, share_with_doctor, anonymous_research, is_main, is_incomplete,
              activity_level, pregnancy_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              relationship = excluded.relationship,
              name = excluded.name,
              age = excluded.age,
              gender = excluded.gender,
              height = excluded.height,
              weight = excluded.weight,
              medical_history = excluded.medical_history,
              allergies = excluded.allergies,
              lifestyle_preferences = excluded.lifestyle_preferences,
              share_with_doctor = excluded.share_with_doctor,
              anonymous_research = excluded.anonymous_research,
              is_main = excluded.is_main,
              is_incomplete = excluded.is_incomplete,
              activity_level = excluded.activity_level,
              pregnancy_status = excluded.pregnancy_status
          `).run(
            p.id,
            cleanedUser.id,
            p.relationship || 'Self',
            p.name,
            p.age ?? 0,
            p.gender || 'Unknown',
            p.height ?? 0,
            p.weight ?? 0,
            p.medicalHistory || '',
            p.allergies || '',
            p.lifestylePreferences || '',
            p.privacySettings?.shareWithDoctor ? 1 : 0,
            p.privacySettings?.anonymousResearch ? 1 : 0,
            isMain,
            p.isIncomplete ? 1 : 0,
            p.activityLevel || 'Sedentary',
            p.pregnancyStatus || 'Not Applicable'
          );
        }
      }
    });

    transaction();
  }

  public static async getUserPasswordHash(userId: string): Promise<string | undefined> {
    this.initDatabase();
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
    return row ? row.password_hash : undefined;
  }

  public static async getUserByEmailWithPassword(email: string): Promise<{ user: User, passwordHash: string } | undefined> {
    this.initDatabase();
    const userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
    if (!userRow) return undefined;

    const profiles = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').all(userRow.id) as any[];
    const user = this.assembleUser(userRow, profiles);
    return {
      user,
      passwordHash: userRow.password_hash || ''
    };
  }

  public static async updateUserProfile(userId: string, profile: UserProfile) {
    this.initDatabase();
    const user = await this.getUserById(userId);
    if (user) {
      this.ensureProfiles(user);
      if (!profile.id) {
        profile.id = 'profile-main';
      }
      if (!profile.relationship) {
        profile.relationship = 'Self';
      }

      // Update main active profile if matched
      if (user.profile.id === profile.id) {
        user.profile = profile;
        user.name = profile.name;
      }

      if (!user.profiles) {
        user.profiles = [user.profile];
      }

      const idx = user.profiles.findIndex(p => p.id === profile.id);
      if (idx >= 0) {
        user.profiles[idx] = profile;
      } else {
        user.profiles.push(profile);
      }
      await this.saveUser(user);
    }
  }

  public static async addUserProfile(userId: string, profile: UserProfile) {
    this.initDatabase();
    const user = await this.getUserById(userId);
    if (user) {
      this.ensureProfiles(user);
      if (!profile.id) {
        profile.id = `profile-${Math.random().toString(36).substr(2, 9)}`;
      }
      if (!user.profiles) {
        user.profiles = [user.profile];
      }
      user.profiles.push(profile);
      await this.saveUser(user);
    }
  }

  public static async deleteUserProfile(userId: string, profileId: string) {
    this.initDatabase();
    const user = await this.getUserById(userId);
    if (user) {
      this.ensureProfiles(user);
      if (user.profiles) {
        user.profiles = user.profiles.filter(p => p.id !== profileId);
        if (user.profile.id === profileId && user.profiles.length > 0) {
          user.profile = user.profiles[0];
          user.name = user.profile.name;
        }
      }
      // Delete the profile record from SQLite
      db.prepare('DELETE FROM user_profiles WHERE id = ?').run(profileId);
      await this.saveUser(user);
    }
  }

  public static async deleteUser(userId: string) {
    this.initDatabase();
    // SQLite ON DELETE CASCADE handles deleting profiles, reports, biomarkers, nutrients, chat, etc.
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }

  // --- Report Operations ---

  public static async getReportsByUserId(userId: string): Promise<MedicalReport[]> {
    this.initDatabase();
    const reportRows = db.prepare('SELECT * FROM medical_reports WHERE user_id = ? ORDER BY upload_date DESC').all(userId) as any[];
    const reports: MedicalReport[] = [];

    for (const reportRow of reportRows) {
      const biomarkerRows = db.prepare('SELECT * FROM report_biomarkers WHERE report_id = ?').all(reportRow.id) as any[];
      const nutrientRows = db.prepare('SELECT * FROM report_nutrients WHERE report_id = ?').all(reportRow.id) as any[];
      reports.push(this.assembleReport(reportRow, biomarkerRows, nutrientRows));
    }
    return reports;
  }

  public static async saveReport(report: MedicalReport) {
    this.initDatabase();
    const transaction = db.transaction(() => {
      // 1. Insert or replace report metadata
      db.prepare(`
        INSERT INTO medical_reports (
          id, user_id, patient_name, file_name, file_type, upload_date, document_type,
          title, overall_health_score, doctor_notes, findings, diagnosis, recommendations,
          specialist_name, specialist_reason, specialist_note, file_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          patient_name = excluded.patient_name,
          file_name = excluded.file_name,
          file_type = excluded.file_type,
          upload_date = excluded.upload_date,
          document_type = excluded.document_type,
          title = excluded.title,
          overall_health_score = excluded.overall_health_score,
          doctor_notes = excluded.doctor_notes,
          findings = excluded.findings,
          diagnosis = excluded.diagnosis,
          recommendations = excluded.recommendations,
          specialist_name = excluded.specialist_name,
          specialist_reason = excluded.specialist_reason,
          specialist_note = excluded.specialist_note,
          file_path = excluded.file_path
      `).run(
        report.id,
        report.userId,
        report.patientName || '',
        report.fileName,
        report.fileType,
        report.uploadDate,
        report.documentType,
        report.analysisResult.title || '',
        report.analysisResult.overallHealthScore || 100,
        report.analysisResult.doctorNotes || '',
        report.analysisResult.findings || '',
        report.analysisResult.diagnosis || '',
        report.analysisResult.recommendations || '',
        report.analysisResult.specialistRecommendation?.specialist || '',
        report.analysisResult.specialistRecommendation?.reason || '',
        report.analysisResult.specialistRecommendation?.note || '',
        report.filePath || null
      );

      // 2. Clean existing children (biomarkers, nutrients)
      db.prepare('DELETE FROM report_biomarkers WHERE report_id = ?').run(report.id);
      db.prepare('DELETE FROM report_nutrients WHERE report_id = ?').run(report.id);

      // 3. Insert Biomarkers
      if (report.analysisResult.biomarkers) {
        for (const b of report.analysisResult.biomarkers) {
          const bId = `b-${report.id}-${b.name.replace(/\s+/g, '_')}`;
          db.prepare(`
            INSERT INTO report_biomarkers (
              id, report_id, name, value, raw_value, unit, reference_range,
              status, explanation, short_term_effects, long_term_effects, food_recommendations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            bId,
            report.id,
            b.name,
            b.value || 0,
            b.rawValue || '0',
            b.unit || '',
            b.referenceRange || '',
            b.status || 'Normal',
            b.explanation || '',
            JSON.stringify(b.shortTermEffects || []),
            JSON.stringify(b.longTermEffects || []),
            JSON.stringify(b.foodRecommendations || [])
          );

          // 4. Save into health_timeline for numeric parameters
          if (b.value !== undefined && b.value !== null && b.value !== 0) {
            const tId = `t-${report.id}-${b.name.replace(/\s+/g, '_')}`;
            db.prepare(`
              INSERT INTO health_timeline (id, user_id, parameter, value, unit, report_date)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                value = excluded.value,
                report_date = excluded.report_date
            `).run(
              tId,
              report.userId,
              b.name,
              b.value,
              b.unit || '',
              report.uploadDate
            );
          }
        }
      }

      // 5. Insert Daily Nutrients
      if (report.analysisResult.dailyNutrients) {
        for (const n of report.analysisResult.dailyNutrients) {
          const nId = `n-${report.id}-${n.name.replace(/\s+/g, '_')}`;
          db.prepare(`
            INSERT INTO report_nutrients (id, report_id, name, recommended_intake, progress, sources)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            nId,
            report.id,
            n.name,
            n.recommendedIntake || '',
            n.progress || 0,
            JSON.stringify(n.sources || [])
          );
        }
      }
    });

    transaction();
  }

  public static async deleteReport(reportId: string, userId: string) {
    this.initDatabase();
    // Cascade constraints on report_id will automatically delete biomarkers and nutrients
    db.prepare('DELETE FROM medical_reports WHERE id = ? AND user_id = ?').run(reportId, userId);
  }

  // --- AI Chat Conversations Operations ---
  public static async saveChatMessage(userId: string, reportId: string | null, role: 'user' | 'assistant', text: string) {
    this.initDatabase();
    const id = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    db.prepare(`
      INSERT INTO ai_conversations (id, user_id, report_id, role, text, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      reportId,
      role,
      text,
      new Date().toISOString()
    );
  }

  public static async getChatHistory(userId: string, reportId: string | null): Promise<any[]> {
    this.initDatabase();
    let rows;
    if (reportId) {
      rows = db.prepare(`
        SELECT role, text, timestamp 
        FROM ai_conversations 
        WHERE user_id = ? AND report_id = ? 
        ORDER BY timestamp ASC
      `).all(userId, reportId) as any[];
    } else {
      rows = db.prepare(`
        SELECT role, text, timestamp 
        FROM ai_conversations 
        WHERE user_id = ? AND report_id IS NULL 
        ORDER BY timestamp ASC
      `).all(userId) as any[];
    }
    return rows;
  }
}
