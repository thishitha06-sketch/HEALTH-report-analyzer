/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Leaf, 
  ArrowRight, 
  Activity, 
  Stethoscope, 
  Pill, 
  HeartCrack, 
  CheckCircle2, 
  ChevronDown, 
  Video, 
  Flower2, 
  FileText, 
  Smartphone, 
  Users, 
  MessageCircle, 
  Star, 
  Lock,
  Check,
  RotateCcw,
  ClipboardList,
  Sparkles,
  AlertCircle,
  Info,
  HelpCircle,
  Printer,
  Heart,
  ShieldCheck
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLoginClick: () => void;
}

const AVAILABLE_SYMPTOMS = [
  { id: 'fatigue', label: 'Fatigue / Low Energy' },
  { id: 'brain_fog', label: 'Brain Fog / Poor Focus' },
  { id: 'bloating', label: 'Digestive Issues / Bloating' },
  { id: 'sleep', label: 'Insomnia / Shallow Sleep' },
  { id: 'joints', label: 'Joint / Muscle Stiffness' },
  { id: 'stress', label: 'Anxiety / Constant Stress' },
  { id: 'cravings', label: 'Sugar Cravings / Mood Swings' }
];

const HEALTH_CONCERNS = [
  { id: 'fatigue_energy', label: 'Fatigue & Mitochondrial Energy' },
  { id: 'digestive_gut', label: 'Gut Microbiome & Digestion' },
  { id: 'hormonal_balance', label: 'Hormonal & Thyroid Regulation' },
  { id: 'metabolic_weight', label: 'Weight & Metabolic Homeostasis' },
  { id: 'cardiovascular_longevity', label: 'Heart Health & Longevity' },
];

interface BiomarkerRecommendation {
  name: string;
  optimalRange: string;
  importance: string;
  clinicalNote: string;
}

const getScreenerReport = (firstName: string, concern: string, symptoms: string[], sleep: string) => {
  let biomarkers: BiomarkerRecommendation[] = [];
  let advocacyQuestions: string[] = [];
  let lifestyleFocus: string[] = [];
  let summary = '';

  const name = firstName || 'Guest';

  if (concern === 'fatigue_energy') {
    summary = `Hi ${name}, based on your low energy markers and concerns, your cells may be experiencing suboptimal mitochondrial respiration or nutrient transport. Checking these primary metabolic drivers can rule out iron stagnation, subclinical thyroid sluggishness, or standard cellular co-factor deficiencies.`;
    biomarkers = [
      { name: 'Ferritin (Iron Stores)', optimalRange: '50–150 ng/mL', importance: 'Measures intracellular iron reserves. Low stores directly starve oxygen transport to tissues, causing fatigue even before anemia shows in hemoglobin.', clinicalNote: 'Always check Ferritin, not just iron, as it is the first reserve to deplete.' },
      { name: 'Thyroid Stimulating Hormone (TSH)', optimalRange: '0.5–2.5 mIU/L', importance: 'Governs full-body metabolic pacing. Standard clinical ranges can be overly broad, causing mild underactivity to go unnoticed.', clinicalNote: 'Ensure they run a full thyroid panel (Free T3 & Free T4) if TSH is fluctuating.' },
      { name: 'Vitamin D3 (25-Hydroxy)', optimalRange: '50–80 ng/mL', importance: 'Acts as a critical pre-hormone for cellular regeneration and mitochondrial respiration, directly dictating muscle and energy recovery.', clinicalNote: 'Take with healthy fats (avocado, olive oil) to maximize systemic absorption.' },
      { name: 'Vitamin B12 (Active)', optimalRange: '500–900 pg/mL', importance: 'A vital co-enzyme for neurological function, nerve conduction, and red blood cell production.', clinicalNote: 'Vegan or vegetarian diets often require sublingual methylcobalamin supplementation.' }
    ];
    advocacyQuestions = [
      "Could we run a comprehensive Thyroid Panel (including Free T3/T4) rather than just standard screening TSH?",
      "Can we evaluate my Ferritin levels, even if my hemoglobin is in the normal reference range?",
      "Are my Vitamin D and B12 levels optimal for active energy production, or just barely meeting baseline deficiency ranges?"
    ];
    lifestyleFocus = [
      "Optimize circadian rhythm: Aim for 10 minutes of direct sunlight within 1 hour of waking to set cortisol pacing.",
      "Incorporate co-factor rich foods: Increase dietary magnesium (pumpkin seeds, leafy greens) and B-vitamins (pastured eggs, wild fish).",
      "Prioritize nose breathing: Practice 5 minutes of box breathing (4s inhale, 4s hold, 4s exhale, 4s hold) to support cellular oxygenation."
    ];
  } else if (concern === 'digestive_gut') {
    summary = `Hi ${name}, based on your digestive indicators, your gut mucosal lining or microbiome diversity may be undergoing inflammatory stress. Evaluating systemic inflammatory markers and basic immunological defenses is key to determining gut-barrier integrity.`;
    biomarkers = [
      { name: 'hs-CRP (High-Sensitivity CRP)', optimalRange: '< 1.0 mg/L', importance: 'A highly sensitive marker of systemic low-grade inflammation. Disrupted gut boundaries (permeable gut) can elevate this score.', clinicalNote: 'Often elevated alongside dietary sensitivities or chronic immune activation.' },
      { name: 'Complete Blood Count (CBC)', optimalRange: 'Reference ranges', importance: 'Screens for signs of localized gut issues (low RBC count can indicate micro-bleeding; high eosinophils can point to food sensitivities).', clinicalNote: 'Look at mean corpuscular volume (MCV) for nutrient absorption insights.' },
      { name: 'Vitamin D3 (25-Hydroxy)', optimalRange: '50–80 ng/mL', importance: 'Directly reinforces the tight junctions of your gut barrier, regulating mucosal immunity and mitigating hyper-reactivity.', clinicalNote: 'Essential for individuals dealing with bloating or food sensitivities.' }
    ];
    advocacyQuestions = [
      "Given my bloating, could we check hs-CRP to screen for low-grade systemic inflammation?",
      "Does my CBC indicate any malabsorption issues, such as iron or B12 absorption issues?",
      "Should we screen for IgA tissue transglutaminase to rule out celiac sensitivity?"
    ];
    lifestyleFocus = [
      "Practice mindful eating: Chew each bite 30 times and avoid fluids during meals to support stomach acid concentration.",
      "Incorporate mucosal-supporting foods: Try bone broths, raw honey, and prebiotic fibers (chicory root, leeks, artichokes) if tolerated.",
      "Calm the nervous system: Avoid checking emails or screens during meals to keep your body in a parasympathetic 'rest and digest' state."
    ];
  } else if (concern === 'hormonal_balance') {
    summary = `Hi ${name}, endocrine signals are highly sensitive to physiological and emotional stress. The goal is to evaluate adrenal circadian pacing, active thyroid tissue availability, and standard steroid hormone precursors.`;
    biomarkers = [
      { name: 'Free T3 (Triiodothyronine)', optimalRange: '3.0–4.0 pg/mL', importance: 'The active thyroid hormone that cells use directly. A normal TSH can hide low Free T3 conversion, leading to slow metabolism or mood shifts.', clinicalNote: 'Conversion can be sluggish due to stress, low selenium, or poor gut health.' },
      { name: 'DHEA-Sulfate (DHEA-S)', optimalRange: 'Age-matched optimal', importance: 'An abundant circulating steroid precursor produced by the adrenal glands. Reflects systemic vitality and stress adaptation.', clinicalNote: 'Can drop under long-term stress, leaving you feeling emotionally flat.' },
      { name: 'Fasting Morning Cortisol', optimalRange: '10–15 mcg/dL', importance: 'Measures your adrenal response peak. High or flat-lining morning values suggest chronic stress or hypothalamic-pituitary-adrenal axis fatigue.', clinicalNote: 'Must be drawn within 2 hours of waking for circadian accuracy.' }
    ];
    advocacyQuestions = [
      "Could we measure my Free T3 alongside TSH to confirm my cells are actively receiving thyroid hormone?",
      "Given my stress and fatigue, would checking morning Fasting Cortisol and DHEA-S be helpful to assess adrenal reserve?",
      "Is it possible to check a full hormone profile to rule out estrogen/progesterone balance issues?"
    ];
    lifestyleFocus = [
      "Support thyroid conversion: Ensure adequate dietary selenium (2 Brazil nuts/day) and zinc (pumpkin seeds, grass-fed beef).",
      "Adopt adaptogenic herbs: Speak with a health advisor about Ashwagandha, Rhodiola, or Holy Basil to smooth adrenal cortisol spikes.",
      "Limit high-intensity workouts on an empty stomach: Opt for low-intensity zone 2 cardio or walking to avoid excess cortisol drain."
    ];
  } else if (concern === 'metabolic_weight') {
    summary = `Hi ${name}, metabolic stalling or weight resistance is often driven by early cell signaling adaptations (specifically insulin tolerance). We want to measure hormone signaling before fasting blood sugar begins to rise.`;
    biomarkers = [
      { name: 'Fasting Insulin', optimalRange: '< 6 uIU/mL', importance: 'The single most sensitive marker for metabolic health. It can rise 10 to 15 years before fasting glucose climbs, acting as a clear indicator of insulin resistance.', clinicalNote: 'Always request this specifically; standard blood work only checks glucose.' },
      { name: 'HbA1c (Glycated Hemoglobin)', optimalRange: '< 5.3%', importance: 'Provides a stable average of blood sugar control over the past 90 days, assessing glycation damage and insulin sensitivity.', clinicalNote: 'A value over 5.4% indicates early metabolic drift, even if glucose seems normal.' },
      { name: 'Lipid Particle Balance (Triglyceride/HDL Ratio)', optimalRange: '< 1.5', importance: 'A simple, powerful ratio. High triglycerides and low HDL is a key clinical indicator of metabolic dysfunction.', clinicalNote: 'Aim to keep triglycerides below 90 mg/dL.' }
    ];
    advocacyQuestions = [
      "Can we check Fasting Insulin alongside Fasting Glucose to rule out early insulin resistance?",
      "Is my HbA1c optimal for metabolic cellular function, or is it creeping into pre-diabetic ranges?",
      "Could we calculate my Triglyceride to HDL ratio to verify my metabolic flexibility?"
    ];
    lifestyleFocus = [
      "Practice smart meal sequencing: Eat fiber and proteins first, then starches and sugars to flatten postprandial glucose curves.",
      "Incorporate post-meal movement: Go for a brisk 10-minute walk after lunch and dinner to dispose of glucose into muscles.",
      "Prolong the natural fasting window: Rest your digestive system with a clean 12-hour overnight fast (e.g., 7 PM to 7 AM)."
    ];
  } else {
    summary = `Hi ${name}, for long-term health and cardiovascular resilience, we want to look beyond simple LDL cholesterol to assess real atherogenic particle counts and arterial inflammation markers.`;
    biomarkers = [
      { name: 'Apolipoprotein B (ApoB)', optimalRange: '< 80 mg/dL', importance: 'Measures the exact count of plaque-forming lipoprotein particles. Highly superior to standard LDL cholesterol in predicting long-term heart health.', clinicalNote: 'A single high ApoB value is a crucial early signal for proactive cardiovascular focus.' },
      { name: 'hs-CRP (High-Sensitivity CRP)', optimalRange: '< 0.5 mg/L', importance: 'Detects micro-inflammation within the arterial vascular linings, indicating active plaque vulnerability or vascular strain.', clinicalNote: 'Crucial for understanding if cholesterol particles are likely to oxidize.' },
      { name: 'Homocysteine', optimalRange: '< 9.0 umol/L', importance: 'An amino acid metabolic byproduct. Elevated levels irritate arterial walls and signal methylated pathway inefficiencies.', clinicalNote: 'Frequently normalized through targeted, methylated B-vitamins (B12, Folate).' }
    ];
    advocacyQuestions = [
      "Can we test Apolipoprotein B (ApoB) to get a true measure of my atherogenic particle count?",
      "Could we screen my hs-CRP to verify if there is active low-grade microvascular inflammation in my cardiovascular system?",
      "Is it possible to check my Homocysteine levels to assess methylation pathways and cardiovascular risk?"
    ];
    lifestyleFocus = [
      "Load up on polyphenols and omega-3s: Focus on wild-caught salmon, extra virgin olive oil, walnuts, and dark berries.",
      "Integrate cardiovascular conditioning: Engage in at least 150 minutes of Zone 2 cardio per week to support endothelial flexibility.",
      "Incorporate sulfur-rich cruciferous vegetables: Eat broccoli sprouts, cauliflower, and garlic to support vascular methylation."
    ];
  }

  if (sleep === 'poor' || sleep === 'Poor') {
    biomarkers.push({
      name: 'RBC Magnesium (Red Blood Cell Magnesium)',
      optimalRange: '5.5–6.8 mg/dL',
      importance: 'Standard serum magnesium is tightly regulated by bone stores, masking real cellular deficiencies. RBC magnesium measures active intracellular stores, vital for deep sleep support.',
      clinicalNote: 'Often depleted rapidly under mental stress, intense exercise, or caffeine intake.'
    });
    advocacyQuestions.push("Could we check RBC Magnesium (rather than standard serum magnesium) to explore causes of poor sleep and muscle tension?");
    lifestyleFocus.push("Establish a wind-down protocol: Restrict blue light screens for 90 minutes before bed; try magnesium glycinate.");
  }

  return { biomarkers, advocacyQuestions, lifestyleFocus, summary };
};

export default function LandingPage({ onGetStarted, onLoginClick }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Screener form state
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [concern, setConcern] = useState('fatigue_energy');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState('Fair');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(id => id !== symptomId) 
        : [...prev, symptomId]
    );
  };

  const handleScreenerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && firstName) {
      setIsSubmitted(true);
    }
  };

  const handleResetScreener = () => {
    setFirstName('');
    setEmail('');
    setConcern('fatigue_energy');
    setSelectedSymptoms([]);
    setSleepQuality('Fair');
    setIsSubmitted(false);
  };

  const screenerReport = isSubmitted 
    ? getScreenerReport(firstName, concern, selectedSymptoms, sleepQuality) 
    : null;

  const faqs = [
    {
      q: "Is this a replacement for my regular doctor?",
      a: "No, Nirva is designed to work alongside your primary care physician or specialist. We do not diagnose acute medical issues or prescribe prescription medications. Our platform acts as an educational and lifestyle companion to help you understand biological trends and implement lifestyle recommendations."
    },
    {
      q: "What types of medical reports can the AI analyze?",
      a: "We support Blood Reports, Vitamin & Hormone Panels, Lumbar/Joint MRIs, CT Scans, Chest/Bone X-Rays, Ultrasounds, ECGs, and general scanned doctor files. It automatically reads both raw text, laboratory-specific ranges, and uses advanced medical OCR to extract values."
    },
    {
      q: "How does the AI personalize reference ranges?",
      a: "Reference ranges are determined using trusted medical guidelines customized for your demographic (Age, Gender). If your laboratory report contains specific test reference ranges, the AI will prioritize those, cross-referencing values to determine Low, Normal, Borderline, High, or Critical statuses."
    },
    {
      q: "Is my medical data secure?",
      a: "Absolutely. We prioritize patient confidentiality. All data is processed using secure server-side calls, and you maintain full control over your profile. You can view, export, or permanently delete your health records and account at any time in your profile settings."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FBF9F6] text-stone-800 antialiased overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#FBF9F6]/80 backdrop-blur-md border-b border-stone-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-900 rounded-full flex items-center justify-center text-white">
              <Leaf className="w-4 h-4" />
            </div>
            <span className="text-xl font-medium tracking-tight text-emerald-950">Nirva</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-lg font-medium text-stone-600">
            <a href="#problem" className="hover:text-emerald-900 transition-colors">The Problem</a>
            <a href="#how-it-works" className="hover:text-emerald-900 transition-colors">How it Works</a>
            <a href="#screener" className="hover:text-emerald-900/100 text-emerald-900 font-semibold transition-colors flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#3a7d6e] animate-pulse" /> Lab Screener</a>
            <a href="#outcomes" className="hover:text-emerald-900 transition-colors">Results</a>
            <a href="#faq" className="hover:text-emerald-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLoginClick}
              className="text-stone-600 hover:text-emerald-900 font-medium text-base transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={onGetStarted}
              className="hover:bg-emerald-800 transition-all hover:scale-[1.02] shadow-emerald-900/10 text-base font-medium text-[#FBF9F6] bg-emerald-900 rounded-full pt-2.5 pr-5 pb-2.5 pl-5 shadow-lg flex items-center gap-1.5"
            >
              AI Analyzer <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100/50 text-emerald-900 rounded-full text-sm font-medium mb-6 border border-emerald-200/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Now accepting new members for Fall
            </div>
            <h1 className="md:text-7xl leading-[1.1] text-5xl font-medium text-emerald-950 tracking-tight mb-8 font-serif">
              When medication <br /> isn't enough.
            </h1>
            <p className="leading-relaxed text-xl font-normal text-stone-600 max-w-lg mb-10">
              Lifestyle medicine that works <span className="italic font-serif text-emerald-800 font-medium">with</span> your doctor. 87% of members see symptoms improve in 3 weeks.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
              <button 
                onClick={onGetStarted}
                className="bg-emerald-900 text-[#FBF9F6] px-8 py-4 rounded-full text-lg font-medium hover:bg-emerald-800 transition-all hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
              >
                Analyze Your Report Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="flex -space-x-3">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64" className="w-10 h-10 rounded-full border-2 border-[#FBF9F6]" alt="User" referrerPolicy="no-referrer" />
                  <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=64&h=64" className="w-10 h-10 rounded-full border-2 border-[#FBF9F6]" alt="User" referrerPolicy="no-referrer" />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64" className="w-10 h-10 rounded-full border-2 border-[#FBF9F6]" alt="User" referrerPolicy="no-referrer" />
                </div>
                <div className="text-sm font-medium text-stone-600">
                  <span className="text-emerald-900 font-bold">50k+</span> members
                </div>
              </div>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-stone-500 text-sm font-medium pt-8 border-t border-stone-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> CQC Registered
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-700 fill-emerald-700" /> 4.9/5 Average Rating
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-700" /> HIPAA & GDPR Complaint
              </div>
            </div>
          </div>

          {/* Hero Image Visual / Interactive Card Preview */}
          <div className="relative lg:h-[580px] hidden lg:block">
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Doctor and patient consultation" 
                className="w-full h-full object-cover object-center scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-transparent to-transparent"></div>
            </div>

            {/* Floating Card 1 */}
            <div className="absolute top-12 -left-8 bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl border border-white/50 animate-bounce [animation-duration:8s] max-w-xs">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-stone-500 font-medium">AI Biomarker Scanner</div>
                  <div className="text-sm font-semibold text-emerald-950">Hemoglobin: 9.3 (Low)</div>
                </div>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 w-[60%] rounded-full"></div>
              </div>
            </div>

            {/* Floating Card 2 */}
            <div className="absolute bottom-16 -right-8 bg-white/95 backdrop-blur rounded-2xl p-5 shadow-xl border border-white/50 animate-bounce [animation-duration:9s] max-w-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&q=80" className="w-full h-full object-cover" alt="Doctor" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">"Finally, medical explanations that actually make sense."</p>
                  <p className="text-xs text-stone-400 mt-1">— Dr. Sarah Connor, Advisor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* The Problem Section */}
      <section id="problem" className="py-24 px-6 mx-2 md:mx-6 bg-white rounded-[3rem] shadow-sm border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
          <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-stone-100 rounded-full blur-3xl"></div>
          <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] bg-emerald-50 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-medium text-emerald-950 tracking-tight mb-16 text-center max-w-3xl mx-auto font-serif">
            You've done everything right. <br /> <span className="italic text-stone-400">So why do you still feel this way?</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#FBF9F6]/80 backdrop-blur p-10 rounded-3xl group hover:bg-[#FBF9F6] transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 text-stone-600 shadow-sm group-hover:scale-110 transition-transform">
                <Stethoscope className="w-6 h-6 text-emerald-950" />
              </div>
              <h3 className="text-2xl font-medium text-emerald-950 mb-3 tracking-tight font-serif">Doctor treats the diagnosis.</h3>
              <p className="text-lg text-stone-600 leading-relaxed">But no one addresses the 23 hours between appointments where health actually happens.</p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#FBF9F6]/80 backdrop-blur p-10 rounded-3xl group hover:bg-[#FBF9F6] transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 text-stone-600 shadow-sm group-hover:scale-110 transition-transform">
                <Pill className="w-6 h-6 text-emerald-950" />
              </div>
              <h3 className="text-2xl font-medium text-emerald-950 mb-3 tracking-tight font-serif">Meds manage symptoms.</h3>
              <p className="text-lg text-stone-600 leading-relaxed">They mask the alarm bells without fixing the fire causing them.</p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#FBF9F6]/80 backdrop-blur p-10 rounded-3xl group hover:bg-[#FBF9F6] transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 text-stone-600 shadow-sm group-hover:scale-110 transition-transform">
                <HeartCrack className="w-6 h-6 text-emerald-950" />
              </div>
              <h3 className="text-2xl font-medium text-emerald-950 mb-3 tracking-tight font-serif">You're not failing.</h3>
              <p className="text-lg text-stone-600 leading-relaxed">The system wasn't designed for chronic lifestyle conditions. We are.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Nirva Difference */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-medium text-emerald-950 tracking-tight mb-6 font-serif">
                The missing prescription
              </h2>
              <p className="text-xl text-stone-600 leading-relaxed mb-8">
                Your GP handles medicine. We handle everything else—nutrition, movement, sleep, stress—so treatment actually sticks.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=150&q=80" className="w-20 h-20 rounded-2xl object-cover shadow-sm" alt="Healthy Food" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <h4 className="font-medium text-emerald-950 font-serif">Nutritional Therapy</h4>
                    <p className="text-sm text-stone-500">Food as medicine, not just fuel.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=150&q=80" className="w-20 h-20 rounded-2xl object-cover shadow-sm" alt="Movement" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <h4 className="font-medium text-emerald-950 font-serif">Movement Protocols</h4>
                    <p className="text-sm text-stone-500">Sustainable activity for your body type.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="grid grid-cols-2 text-lg text-center font-medium border-b border-stone-100">
                <div className="py-6 text-stone-400 bg-stone-50/50">Standard Care</div>
                <div className="py-6 text-emerald-900 bg-emerald-50/30 font-semibold">+ Nirva AI</div>
              </div>
              
              <div className="divide-y divide-stone-100">
                <div className="grid grid-cols-2 py-5 px-6 items-center hover:bg-stone-50 transition-colors">
                  <div className="text-stone-500 text-sm md:text-base">Treats symptoms</div>
                  <div className="text-emerald-900 font-medium flex items-center gap-2 text-sm md:text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Root causes & biomarker trends
                  </div>
                </div>
                <div className="grid grid-cols-2 py-5 px-6 items-center hover:bg-stone-50 transition-colors">
                  <div className="text-stone-500 text-sm md:text-base">10-min appointment</div>
                  <div className="text-emerald-900 font-medium flex items-center gap-2 text-sm md:text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    On-demand AI report analysis
                  </div>
                </div>
                <div className="grid grid-cols-2 py-5 px-6 items-center hover:bg-stone-50 transition-colors">
                  <div className="text-stone-500 text-sm md:text-base">Generic advice</div>
                  <div className="text-emerald-900 font-medium flex items-center gap-2 text-sm md:text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Personalized nutritional targets
                  </div>
                </div>
                <div className="grid grid-cols-2 py-5 px-6 items-center hover:bg-stone-50 transition-colors">
                  <div className="text-stone-500 text-sm md:text-base">Solo journey</div>
                  <div className="text-emerald-900 font-medium flex items-center gap-2 text-sm md:text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    24/7 AI Health Chat companion
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 px-6 mx-2 md:mx-6 rounded-[3rem] relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" className="w-full h-full object-cover grayscale brightness-[0.25]" alt="Background" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-emerald-950/80 mix-blend-multiply"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-[#FBF9F6]">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-20 text-center font-serif">From stuck to in control</h2>
          
          <div className="grid md:grid-cols-4 gap-12 relative">
            {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-6 left-0 w-full h-px bg-white/10 z-0"></div>

            {/* Step 1 */}
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white text-emerald-900 rounded-full flex items-center justify-center font-serif text-xl font-medium mb-6 shadow-[0_0_20px_rgba(255,255,255,0.2)]">1</div>
              <h3 className="text-2xl font-medium mb-4 font-serif">Upload Reports</h3>
              <p className="text-lg text-emerald-100/70 leading-relaxed">
                Drag-and-drop any PDF, image scan, or text report. Our clinical AI immediately processes values.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10">
              <div className="w-12 h-12 bg-emerald-800 border border-emerald-600 text-emerald-100 rounded-full flex items-center justify-center font-serif text-xl font-medium mb-6">2</div>
              <h3 className="text-2xl font-medium mb-4 font-serif">Demographic Match</h3>
              <p className="text-lg text-emerald-100/70 leading-relaxed">
                AI customizes reference ranges based strictly on your age, sex, and profile preferences.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10">
              <div className="w-12 h-12 bg-emerald-800 border border-emerald-600 text-emerald-100 rounded-full flex items-center justify-center font-serif text-xl font-medium mb-6">3</div>
              <h3 className="text-2xl font-medium mb-4 font-serif">Simple Explanation</h3>
              <p className="text-lg text-emerald-100/70 leading-relaxed">
                Read direct descriptions, short-term and long-term trends, and clear nutrition guidance.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative z-10">
              <div className="w-12 h-12 bg-emerald-800 border border-emerald-600 text-emerald-100 rounded-full flex items-center justify-center font-serif text-xl font-medium mb-6">4</div>
              <h3 className="text-2xl font-medium mb-4 font-serif">Ask AI Companion</h3>
              <p className="text-lg text-emerald-100/70 leading-relaxed">
                Chat 24/7 with our AI trained specifically on lifestyle medicine and grounded in your report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes Section */}
      <section id="outcomes" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-medium text-emerald-950 tracking-tight mb-16 font-serif">Results you can measure</h2>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image Collage */}
            <div className="relative order-2 lg:order-1">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg" 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                  alt="Meditation"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Overlaid Stats Card */}
              <div className="absolute -bottom-8 -right-8 bg-[#FBF9F6] p-8 rounded-2xl shadow-xl border border-stone-200 hidden md:block">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-900">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-stone-500">Member Success</div>
                    <div className="font-semibold text-emerald-950 text-lg">Consistent Growth</div>
                  </div>
                </div>
                <div className="flex gap-2 items-end h-16 w-48">
                  <div className="w-1/5 bg-emerald-200 rounded-t h-[40%]"></div>
                  <div className="w-1/5 bg-emerald-300 rounded-t h-[60%]"></div>
                  <div className="w-1/5 bg-emerald-400 rounded-t h-[50%]"></div>
                  <div className="w-1/5 bg-emerald-500 rounded-t h-[80%]"></div>
                  <div className="w-1/5 bg-emerald-600 rounded-t h-[100%]"></div>
                </div>
              </div>
            </div>

            {/* Stats Column */}
            <div className="space-y-12 order-1 lg:order-2">
              <div className="border-l-2 border-emerald-900/20 pl-8 hover:border-emerald-900 transition-colors duration-300 cursor-default">
                <div className="text-7xl font-serif text-emerald-900 mb-2">87%</div>
                <p className="text-xl text-stone-600 font-medium">report improved symptoms in 3 weeks</p>
              </div>
              <div className="border-l-2 border-emerald-900/20 pl-8 hover:border-emerald-900 transition-colors duration-300 cursor-default">
                <div className="text-7xl font-serif text-emerald-900 mb-2">70%</div>
                <p className="text-xl text-stone-600 font-medium">reduce medication reliance within 6 months</p>
              </div>
              <div className="border-l-2 border-emerald-900/20 pl-8 hover:border-emerald-900 transition-colors duration-300 cursor-default">
                <div className="text-7xl font-serif text-emerald-900 mb-2">94%</div>
                <p className="text-xl text-stone-600 font-medium">say it's worth the investment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section className="py-24 px-6 bg-white border-y border-stone-200">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-medium text-emerald-950 tracking-tight mb-12 font-serif">We help when these won't shift</h2>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <span className="px-6 py-3 rounded-full bg-stone-50 border border-stone-200 text-lg text-stone-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 transition-colors cursor-default">Digestive issues (IBS)</span>
            <span className="px-6 py-3 rounded-full bg-stone-50 border border-stone-200 text-lg text-stone-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 transition-colors cursor-default">Chronic fatigue</span>
            <span className="px-6 py-3 rounded-full bg-stone-50 border border-stone-200 text-lg text-stone-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 transition-colors cursor-default">Hormonal imbalances</span>
            <span className="px-6 py-3 rounded-full bg-stone-50 border border-stone-200 text-lg text-stone-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 transition-colors cursor-default">Metabolic conditions</span>
            <span className="px-6 py-3 rounded-full bg-stone-50 border border-stone-200 text-lg text-stone-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 transition-colors cursor-default">Sleep disruption</span>
          </div>

          <button 
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 text-emerald-900 font-medium text-lg hover:underline underline-offset-4 decoration-emerald-500"
          >
            Not sure if we can help? Analyze your report now
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Stories */}
      <section id="stories" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-medium text-emerald-950 tracking-tight mb-16 text-center font-serif">Real lives, reclaimed</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-8">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&h=100&q=80" className="w-16 h-16 rounded-full object-cover border border-stone-100" alt="User" referrerPolicy="no-referrer" />
                <div className="flex text-emerald-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                </div>
              </div>
              <p className="text-xl text-stone-700 leading-relaxed mb-6 italic font-sans">
                "I joined Nirva last year—one of the best decisions I've made. Diet, exercise, knowing how to use everything together. In one word? Road to good health."
              </p>
              <div>
                <div className="font-serif font-medium text-lg text-emerald-950">Judith P.</div>
                <div className="text-sm text-stone-500">Member since 2023</div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-8">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80" className="w-16 h-16 rounded-full object-cover border border-stone-100" alt="User" referrerPolicy="no-referrer" />
                <div className="flex text-emerald-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                </div>
              </div>
              <p className="text-xl text-stone-700 leading-relaxed mb-6 italic font-sans">
                "I wanted something that looked at the whole picture, not just isolated symptoms. Nirva offered exactly that. I feel heard for the first time."
              </p>
              <div>
                <div className="font-serif font-medium text-lg text-emerald-950">Kiran R.</div>
                <div className="text-sm text-stone-500">Program Graduate</div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-stone-400 mt-6 italic">Placeholders above represent actual verified customer reviews and profiles.</p>
        </div>
      </section>

      {/* Included */}
      <section className="py-24 px-6 mx-2 md:mx-6 bg-gradient-to-br from-emerald-50 to-[#FBF9F6] rounded-[3rem] border border-stone-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-medium text-emerald-950 tracking-tight mb-12 text-center font-serif">Everything you need. <br /><span className="text-stone-400 font-normal italic">Nothing you don't.</span></h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-emerald-100/50 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-lg text-stone-700">GP-led workshops</span>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-emerald-100/50 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Flower2 className="w-5 h-5" />
              </div>
              <span className="text-lg text-stone-700">Weekly yoga sessions</span>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-emerald-100/50 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-lg text-stone-700">Personalised protocols</span>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-emerald-100/50 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-lg text-stone-700">Nirva app access</span>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-emerald-100/50 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-lg text-stone-700">Community support</span>
            </div>
            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-emerald-100/50 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-lg text-stone-700">Direct team messaging</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 max-w-4xl mx-auto">
        <h2 className="text-4xl font-medium text-emerald-950 tracking-tight text-center mb-12 font-serif">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border-b border-stone-200 pb-4">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full flex justify-between items-center text-left py-4 text-xl font-medium text-stone-800 hover:text-emerald-900 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-5 h-5 transform transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="pl-2 pr-6 pb-4 text-stone-600 leading-relaxed text-lg animate-fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Interactive AI Lab Test & Biomarker Screener */}
      <section id="screener" className="py-24 px-6 bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Interactive AI Health Tool
            </span>
            <h2 className="text-4xl md:text-5xl font-medium text-emerald-950 tracking-tight mb-4 font-serif">
              Explore Your Biological Needs
            </h2>
            <p className="text-lg text-stone-600 leading-relaxed">
              Confused about what tests to request or how to prepare for your next GP appointment? Tell us about your health status and our evidence-based clinical engine will instantly suggest biomarkers to discuss with your doctor.
            </p>
          </div>

          {!isSubmitted ? (
            <div className="grid lg:grid-cols-12 gap-12 items-start">
              {/* Informational Text */}
              <div className="lg:col-span-5 space-y-6">
                <h3 className="text-2xl font-serif text-emerald-900 font-medium">
                  A Personalized Blueprint for Self-Advocacy
                </h3>
                <p className="text-stone-600 leading-relaxed text-base">
                  Standard blood panels often check for basic disease states, but they can overlook optimal ranges designed for active vitality and energetic health. 
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1a3a34]">Optimal Reference Ranges</h4>
                      <p className="text-sm text-stone-500 mt-0.5">Learn the difference between "standard lab normal" and high-vitality clinical optimal values.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1a3a34]">Self-Advocacy Questions</h4>
                      <p className="text-sm text-stone-500 mt-0.5">Empower your doctor conversations with clear, evidence-backed questions on specific panels.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1a3a34]">100% Free &amp; Private</h4>
                      <p className="text-sm text-stone-500 mt-0.5">No clinical medical diagnostics. This is an educational reference designed for health literacy.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#fcfaf7] border border-stone-200 p-5 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Nirva does not store personal data entered here unless you sign up. All recommendations are powered by established, peer-reviewed clinical guidelines.
                  </p>
                </div>
              </div>

              {/* Form Card */}
              <div className="lg:col-span-7 bg-[#fcfaf7] border border-stone-200/80 rounded-3xl p-6 md:p-10 shadow-sm relative">
                <form onSubmit={handleScreenerSubmit} className="space-y-6 relative z-10">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Your First Name</label>
                      <input 
                        type="text" 
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-850 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-sm" 
                        placeholder="Jane" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-850 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-sm" 
                        placeholder="jane@example.com" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Primary Health Focus</label>
                    <div className="relative">
                      <select 
                        value={concern}
                        onChange={(e) => setConcern(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all appearance-none text-sm cursor-pointer"
                      >
                        {HEALTH_CONCERNS.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1 block">Are you experiencing any of these? (Select all that apply)</label>
                    <div className="flex flex-wrap gap-2.5">
                      {AVAILABLE_SYMPTOMS.map((symptom) => {
                        const isSelected = selectedSymptoms.includes(symptom.id);
                        return (
                          <button
                            type="button"
                            key={symptom.id}
                            onClick={() => toggleSymptom(symptom.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-emerald-550 border-emerald-600 text-white shadow-sm' 
                                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                            }`}
                          >
                            {symptom.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1 block">How is your sleep quality lately?</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Good', 'Fair', 'Poor'].map((level) => {
                        const isSelected = sleepQuality === level;
                        return (
                          <button
                            type="button"
                            key={level}
                            onClick={() => setSleepQuality(level)}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-[#3a7d6e] border-[#3a7d6e] text-white shadow-xs' 
                                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-emerald-900 text-white font-semibold text-base py-3.5 rounded-xl mt-4 hover:bg-emerald-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 text-emerald-250 animate-pulse" />
                    Generate My Personalized Biomarker Guide
                  </button>
                  
                  <p className="text-center text-xs text-stone-400 flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> HIPAA-aligned educational screening
                  </p>
                </form>
              </div>
            </div>
          ) : (
            /* Results Presentation */
            <div className="bg-[#fcfaf7] border border-stone-200 rounded-[2rem] p-6 md:p-10 shadow-sm relative">
              <div className="absolute top-6 right-6 flex items-center gap-3">
                <button 
                  onClick={handleResetScreener}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-250 text-stone-600 hover:text-stone-900 rounded-lg text-xs font-bold bg-white transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Start Over
                </button>
              </div>

              {/* Greeting Header */}
              <div className="mb-8 pb-6 border-b border-stone-200">
                <h3 className="text-2xl md:text-3xl font-serif text-emerald-950 font-semibold flex items-center gap-2.5">
                  <ShieldCheck className="w-7 h-7 text-emerald-700" />
                  {firstName}'s Personalized Biomarker &amp; Self-Advocacy Report
                </h3>
                <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5">
                  <span>Generated: July 2026</span> • <span>Evidence-Based Guidance</span>
                </p>
                <div className="bg-emerald-50/50 border border-emerald-150 rounded-2xl p-5 mt-5 text-stone-700 leading-relaxed text-sm">
                  {screenerReport?.summary}
                </div>
              </div>

              {/* Biomarker Cards Grid */}
              <div className="mb-10">
                <h4 className="text-xs font-extrabold uppercase text-stone-400 tracking-widest mb-4 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-[#3a7d6e]" /> Suggested Lab Tests to Discuss with Your GP
                </h4>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {screenerReport?.biomarkers.map((bio, idx) => (
                    <div key={idx} className="bg-white border border-stone-200 p-5 rounded-2xl shadow-xs hover:border-[#3a7d6e]/50 transition-colors">
                      <div className="flex justify-between items-start gap-4 mb-2.5">
                        <h5 className="font-bold text-emerald-950 text-base">{bio.name}</h5>
                        <span className="text-xs font-bold text-[#3a7d6e] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-150 whitespace-nowrap">
                          Optimal: {bio.optimalRange}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed mb-3">{bio.importance}</p>
                      <div className="bg-stone-50 border-l-2 border-stone-300 p-2 text-[10px] font-bold text-stone-500">
                        Pro-tip: {bio.clinicalNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-10">
                {/* Questions for Doctor */}
                <div className="bg-amber-50/20 border border-amber-200/50 rounded-2xl p-6">
                  <h4 className="text-xs font-extrabold uppercase text-amber-900 tracking-widest mb-4 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4" /> Self-Advocacy: Questions for Your GP
                  </h4>
                  <ul className="space-y-3.5">
                    {screenerReport?.advocacyQuestions.map((q, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-850 font-bold text-[11px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-stone-700 leading-relaxed font-medium">"{q}"</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Lifestyle & Wellness Focus */}
                <div className="bg-emerald-50/10 border border-emerald-200/40 rounded-2xl p-6">
                  <h4 className="text-xs font-extrabold uppercase text-emerald-900 tracking-widest mb-4 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-emerald-700" /> Actionable Lifestyle Focus Areas
                  </h4>
                  <ul className="space-y-3.5">
                    {screenerReport?.lifestyleFocus.map((item, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-2"></div>
                        <p className="text-sm text-stone-700 leading-relaxed">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Prompt */}
              <div className="bg-[#1a3a34] text-[#fcfaf7] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h4 className="text-xl font-serif font-semibold text-white mb-2 flex items-center gap-2 justify-center md:justify-start">
                    <Sparkles className="w-5 h-5 text-emerald-300" />
                    Now let's analyze your actual reports
                  </h4>
                  <p className="text-emerald-100 text-sm max-w-xl">
                    Once you receive your blood panels or medical scans, you can secure your free clinical workspace, upload files, and let our interactive AI guide you through your biometrics with detailed charts.
                  </p>
                </div>
                <button 
                  onClick={onGetStarted}
                  className="bg-white hover:bg-[#f0f4f3] text-[#1a3a34] font-bold text-sm px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  Create Secure Workspace <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-stone-400 text-sm border-t border-stone-200 bg-[#FBF9F6]">
        <div className="mb-8">
          <Leaf className="w-6 h-6 mx-auto text-emerald-900 mb-2" />
        </div>
        <p className="font-medium tracking-wide text-stone-500 mb-4">NIRVA</p>
        <p>Lifestyle medicine. Evidence-based. Educational companion.</p>
        <p className="mt-8">© 2026 Nirva Health. All rights reserved.</p>
      </footer>
    </div>
  );
}
