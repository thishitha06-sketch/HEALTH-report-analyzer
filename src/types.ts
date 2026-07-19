/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BiomarkerStatus = 'Normal' | 'Borderline' | 'High' | 'Low' | 'Critical';

export interface FoodRecommendation {
  foodName: string;
  amount: string;
  isVegetarian: boolean;
}

export interface Biomarker {
  name: string;
  value: number; // numeric value for graphing
  rawValue: string; // e.g. "9.3"
  unit: string;
  referenceRange: string;
  status: BiomarkerStatus;
  explanation: string;
  shortTermEffects: string[];
  longTermEffects: string[];
  foodRecommendations: FoodRecommendation[];
}

export interface NutrientSource {
  foodName: string;
  quantity: string;
}

export interface NutrientRequirement {
  name: string;
  recommendedIntake: string;
  progress: number; // if tracked by user
  sources: NutrientSource[];
}

export interface SpecialistRecommendation {
  specialist: string;
  reason: string;
  note: string;
}

export interface AnalysisResult {
  title: string;
  documentType: 'Blood Report' | 'MRI' | 'CT Scan' | 'X-Ray' | 'Ultrasound' | 'ECG' | 'General Scan' | 'Other';
  overallHealthScore: number;
  doctorNotes: string;
  findings: string;
  diagnosis: string;
  recommendations: string;
  specialistRecommendation: SpecialistRecommendation;
  biomarkers: Biomarker[];
  dailyNutrients: NutrientRequirement[];
}

export interface MedicalReport {
  id: string;
  userId: string;
  patientName?: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  documentType: string;
  analysisResult: AnalysisResult;
  filePath?: string;
}

export interface UserProfile {
  id?: string;
  relationship?: 'Self' | 'Family' | 'Friend' | 'Spouse' | 'Child' | 'Parent' | 'Other';
  name: string;
  age: number | null;
  gender: 'Male' | 'Female' | 'Other' | 'Unknown' | string;
  height: number | null; // cm
  weight: number | null; // kg
  medicalHistory: string;
  allergies: string;
  lifestylePreferences: string;
  privacySettings: {
    shareWithDoctor: boolean;
    anonymousResearch: boolean;
  };
  isIncomplete?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
  profiles?: UserProfile[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface UserSettings {
  darkMode: boolean;
  notifications: boolean;
  language: 'English' | 'Spanish' | 'French' | 'German' | 'Hindi' | 'Telugu' | 'Malayalam';
}
