/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertTriangle, Check, RefreshCw, File, Shield, ChevronRight, Apple, AlertOctagon, ArrowRight } from 'lucide-react';
import { MedicalReport, BiomarkerStatus, User } from '../types';

interface ReportAnalyzerProps {
  onAnalysisComplete: (newReport: MedicalReport) => void;
  token: string;
  onNavigateToChat: (reportId: string) => void;
  selectedReport?: MedicalReport | null;
  onClearSelectedReport?: () => void;
  user?: User | null;
  language?: string;
}

export default function ReportAnalyzer({ 
  onAnalysisComplete, 
  token, 
  onNavigateToChat, 
  selectedReport = null,
  onClearSelectedReport,
  user = null,
  language = 'English'
}: ReportAnalyzerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  useEffect(() => {
    if (user) {
      setSelectedProfileId(user.profile.id || 'profile-main');
    }
  }, [user]);

  // Active Report View for immediate viewing after analysis
  const [viewedReport, setViewedReport] = useState<MedicalReport | null>(null);

  // Sync viewedReport state when selectedReport prop changes (e.g. clicked from dashboard)
  useEffect(() => {
    if (selectedReport) {
      setViewedReport(selectedReport);
    }
  }, [selectedReport]);

  const handleClearViewed = () => {
    setViewedReport(null);
    if (onClearSelectedReport) {
      onClearSelectedReport();
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedProfile = user?.profiles?.find(p => p.id === selectedProfileId) || user?.profile;
  const isProfileIncomplete = !selectedProfile || selectedProfile.isIncomplete;

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg('');
    const validTypes = [
      'application/pdf', 
      'text/plain', 
      'image/jpeg', 
      'image/png', 
      'image/jpg',
      'image/heic',
      'image/heif'
    ];
    
    // Accept standard extension fallbacks
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'jpeg', 'heic', 'heif'].includes(ext || '');

    if (validTypes.includes(file.type) || isValidExt) {
      setSelectedFile(file);
    } else {
      setErrorMsg("Unsupported file format. Please upload a PDF, DOCX, TXT, or image format (JPG, PNG, HEIC).");
    }
  };

  // Convert File to Base64
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleAnalyze = async () => {
    if (!selectedFile && !textInput.trim()) {
      setErrorMsg("Please select a file or paste report text to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg('');
    setViewedReport(null);

    try {
      let payload: any = {};
      
      if (activeTab === 'upload' && selectedFile) {
        const base64Data = await toBase64(selectedFile);
        payload = {
          fileData: base64Data,
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/pdf',
          targetProfileId: selectedProfileId,
          language
        };
      } else {
        payload = {
          textContent: textInput,
          fileName: "Copied Medical Text",
          fileType: "text/plain",
          targetProfileId: selectedProfileId,
          language
        };
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Medical report analysis failed.");
      }

      onAnalysisComplete(data.report);
      setViewedReport(data.report);
      
      // Clean states
      setSelectedFile(null);
      setTextInput('');
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during medical evaluation.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColorClasses = (status: BiomarkerStatus) => {
    switch (status) {
      case 'Normal':
        return { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', circle: 'bg-green-500' };
      case 'Borderline':
        return { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', circle: 'bg-yellow-500' };
      case 'High':
        return { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', circle: 'bg-orange-500' };
      case 'Low':
        return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', circle: 'bg-red-500' };
      case 'Critical':
        return { text: 'text-red-900', bg: 'bg-red-100', border: 'border-red-300', circle: 'bg-red-850' };
      default:
        return { text: 'text-stone-600', bg: 'bg-stone-50', border: 'border-stone-200', circle: 'bg-stone-400' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-700 border-green-200 bg-green-50/50';
    if (score >= 75) return 'text-yellow-700 border-yellow-200 bg-yellow-50/50';
    if (score >= 50) return 'text-orange-700 border-orange-200 bg-orange-50/50';
    return 'text-red-700 border-red-200 bg-red-50/50';
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-serif text-emerald-950 font-medium mb-2">AI Report Analyzer</h1>
        <p className="text-stone-500">Upload your biological panels or medical scans. Our clinical AI immediately explains raw results in clear, warm language.</p>
      </div>

      {!viewedReport && !isAnalyzing && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden mb-12">
          {/* Form Tabs */}
          <div className="flex border-b border-stone-150 text-sm font-semibold bg-[#FBF9F6]">
            <button
              onClick={() => { setActiveTab('upload'); setErrorMsg(''); }}
              className={`flex-1 py-4 text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'upload' ? 'border-emerald-900 text-emerald-900 font-bold bg-white' : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              Document / Image Upload
            </button>
            <button
              onClick={() => { setActiveTab('paste'); setErrorMsg(''); }}
              className={`flex-1 py-4 text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'paste' ? 'border-emerald-900 text-emerald-900 font-bold bg-white' : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              Paste Report Text
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'upload' ? (
              /* Drag & Drop Area */
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                  dragActive ? 'border-emerald-800 bg-emerald-50/20' : 'border-stone-250 hover:border-stone-400 bg-[#FBF9F6]/50 hover:bg-[#FBF9F6]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,image/*"
                />
                
                {selectedFile ? (
                  <div className="space-y-4 animate-fade-in">
                    <File className="w-16 h-16 text-emerald-800 mx-auto" />
                    <div>
                      <p className="font-semibold text-stone-800 text-lg">{selectedFile.name}</p>
                      <p className="text-sm text-stone-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="text-sm text-red-750 hover:underline font-semibold"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-stone-400 mx-auto" />
                    <div>
                      <p className="font-semibold text-stone-700 text-lg">Drag & drop your medical document here</p>
                      <p className="text-stone-400 text-sm mt-1">Accepts PDF, Image, JPG, PNG, DOCX, or TXT up to 25MB</p>
                    </div>
                    <span className="inline-flex bg-white border border-stone-200 text-stone-700 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow">
                      Browse Files
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Paste Copy-Paste Text Area */
              <div className="space-y-4">
                <label className="text-sm font-semibold text-stone-500 block">Copy-Paste Raw Report Content</label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full bg-[#FBF9F6]/50 border border-stone-200 rounded-2xl p-5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all h-48 placeholder:text-stone-300 text-base"
                  placeholder="Paste laboratory outcomes, MRI description lines, CT summaries, or doctor findings here..."
                />
              </div>
            )}

            {/* Error Indicators */}
            {errorMsg && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-sm text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Optional Profile Info Notice */}
            {isProfileIncomplete && (
              <div className="mt-6 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-amber-850 text-sm flex items-start gap-3 animate-fade-in" id="optional-profile-banner">
                <AlertTriangle className="w-5 h-5 text-amber-650 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Profile information is optional</p>
                  <p className="text-xs text-amber-700 mt-0.5">Complete your profile to receive more personalized nutrition and health recommendations.</p>
                </div>
              </div>
            )}

            {/* Target Profile Selection */}
            {user && (user.profiles?.length ?? 0) > 0 && (
              <div className="mt-6 p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-semibold text-stone-700 block mb-1">Analyze This Report For</label>
                  <p className="text-xs text-stone-500">The AI will customize biological normal ranges, safe thresholds, and dietary guidance for this person.</p>
                </div>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-stone-850 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 cursor-pointer min-w-[200px]"
                >
                  {user.profiles?.map(p => (
                    <option key={p.id} value={p.id || 'profile-main'}>
                      {p.name} ({p.relationship === 'Self' ? 'Self' : p.relationship})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Analyze Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleAnalyze}
                className="bg-[#3a7d6e] hover:bg-[#2d6155] text-white font-medium text-lg px-8 py-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                Run AI Evaluation
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated Scanning Loader Overlay */}
      {isAnalyzing && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-900/10 flex items-center justify-center animate-spin">
              <RefreshCw className="w-10 h-10 text-emerald-900" />
            </div>
            {/* Pulsing glow under */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"></div>
          </div>
          
          <h2 className="text-3xl font-serif text-emerald-950 font-medium mb-3 animate-pulse">Running Clinical Medical OCR</h2>
          <p className="text-stone-500 max-w-sm mx-auto leading-relaxed text-base">
            Digitizing documents, detecting demographic ranges, translating medical terms, and tailoring nutritional guides. This may take up to 20 seconds...
          </p>
        </div>
      )}

      {/* Detailed Diagnostic Report Outcome Presentation */}
      {viewedReport && !isAnalyzing && (
        <div className="space-y-8 animate-fade-in">
          {/* Summary Banner Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold mb-3">
                <Shield className="w-3.5 h-3.5" />
                {viewedReport.documentType}
              </div>
              <h2 className="text-3xl font-serif text-emerald-950 font-medium mb-2">{viewedReport.analysisResult.title}</h2>
              <p className="text-stone-400 text-sm flex flex-wrap items-center gap-2">
                {viewedReport.patientName && (
                  <>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100/50">Patient: {viewedReport.patientName}</span>
                    <span>•</span>
                  </>
                )}
                <span>File Name: {viewedReport.fileName}</span>
                <span>•</span>
                <span>Uploaded: {new Date(viewedReport.uploadDate).toLocaleDateString()}</span>
              </p>
            </div>

            {/* Score Metric Card */}
            <div className={`border rounded-2xl p-4 flex flex-col items-center justify-center text-center ${getScoreColor(viewedReport.analysisResult.overallHealthScore)}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Health Score</span>
              <span className="text-4xl font-serif font-semibold mt-1">{viewedReport.analysisResult.overallHealthScore}</span>
              <span className="text-[10px] text-stone-500 font-medium mt-1">Derived from metrics</span>
            </div>
          </div>

          {/* Core Findings Overview */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Physician's Summary Notes */}
            <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
              <h3 className="text-xl font-serif text-emerald-950 font-medium mb-4">Physician Notes &amp; Findings</h3>
              <div className="text-stone-700 space-y-4 leading-relaxed text-base">
                <p className="italic bg-[#FBF9F6] p-5 rounded-2xl border border-stone-100">
                  "{viewedReport.analysisResult.doctorNotes}"
                </p>
                <div className="space-y-2">
                  <h4 className="font-bold text-stone-800">Primary Observations:</h4>
                  <p>{viewedReport.analysisResult.findings}</p>
                </div>
              </div>
            </div>

            {/* Diagnosis & Immediate Action Recommendations */}
            <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-serif text-emerald-950 font-medium mb-4">Educational Explanations</h3>
                <div className="space-y-4 text-base text-stone-700">
                  <div>
                    <h4 className="font-bold text-stone-800">Evaluated Diagnoses:</h4>
                    <p className="text-emerald-900 font-semibold">{viewedReport.analysisResult.diagnosis}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800">Action Recommendations:</h4>
                    <p className="leading-relaxed">{viewedReport.analysisResult.recommendations}</p>
                  </div>
                </div>
              </div>

              {/* Chat grounding routing button */}
              <button
                onClick={() => onNavigateToChat(viewedReport.id)}
                className="mt-6 w-full bg-emerald-900 hover:bg-emerald-800 text-white font-medium py-3.5 px-4 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
              >
                Discuss Report with AI Companion
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Biomarkers Comparative Breakdown */}
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
            <h3 className="text-2xl font-serif text-emerald-950 font-medium mb-6">Evaluated Biomarkers</h3>
            
            <div className="space-y-6">
              {viewedReport.analysisResult.biomarkers.map((bio, index) => {
                const styles = getStatusColorClasses(bio.status);
                return (
                  <div key={index} className="border border-stone-150 rounded-2xl p-6 hover:border-stone-300 transition-colors">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 border-b border-stone-100 pb-4">
                      <div>
                        <h4 className="font-bold text-stone-800 text-lg">{bio.name}</h4>
                        <span className="text-stone-400 text-xs font-semibold">Trackable Marker</span>
                      </div>

                      {/* Values Grid */}
                      <div className="flex items-center gap-6">
                        {/* Patient Value */}
                        <div className="text-right">
                          <span className="text-stone-400 text-[10px] uppercase font-bold block">Your Value</span>
                          <span className="font-mono font-bold text-xl text-stone-800">
                            {bio.rawValue} <span className="text-xs font-normal text-stone-400">{bio.unit}</span>
                          </span>
                        </div>

                        {/* Custom Reference Range */}
                        <div className="text-right">
                          <span className="text-stone-400 text-[10px] uppercase font-bold block">Demographic Range</span>
                          <span className="font-mono font-semibold text-stone-700 text-base">
                            {bio.referenceRange} <span className="text-xs font-normal text-stone-400">{bio.unit}</span>
                          </span>
                        </div>

                        {/* Status Tag */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles.text} ${styles.bg} border ${styles.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${styles.circle}`} />
                          {bio.status}
                        </span>
                      </div>
                    </div>

                    {/* Explanations & Symptom breakdown */}
                    <div className="grid md:grid-cols-3 gap-6 text-sm text-stone-600 mb-4">
                      {/* Plain-English Explanation */}
                      <div className="md:col-span-1 space-y-1">
                        <span className="font-bold text-stone-800 block text-xs uppercase tracking-wider">Simple Explanation</span>
                        <p className="leading-relaxed">{bio.explanation}</p>
                      </div>

                      {/* Short Term Symptoms */}
                      <div className="md:col-span-1 space-y-1">
                        <span className="font-bold text-stone-800 block text-xs uppercase tracking-wider">Short-Term Effects</span>
                        {bio.shortTermEffects && bio.shortTermEffects.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 pl-1">
                            {bio.shortTermEffects.map((eff, i) => (
                              <li key={i}>{eff}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-stone-400 italic">No adverse short-term effects indicated.</p>
                        )}
                      </div>

                      {/* Long Term Risks */}
                      <div className="md:col-span-1 space-y-1">
                        <span className="font-bold text-stone-800 block text-xs uppercase tracking-wider">Long-Term Risks (If Untreated)</span>
                        {bio.longTermEffects && bio.longTermEffects.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 pl-1">
                            {bio.longTermEffects.map((eff, i) => (
                              <li key={i}>{eff}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-stone-400 italic">No critical long-term risks identified.</p>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Food Recommendations inside biomarkers */}
                    {bio.foodRecommendations && bio.foodRecommendations.length > 0 && (
                      <div className="bg-[#FBF9F6] border border-stone-150 rounded-xl p-4 mt-4">
                        <h5 className="font-bold text-stone-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Apple className="w-4 h-4 text-emerald-800" />
                          Recommended Dietary Additions for this biomarker:
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {bio.foodRecommendations.map((food, fIdx) => (
                            <div key={fIdx} className="bg-white rounded-lg p-3 border border-stone-100 flex flex-col justify-between">
                              <span className="font-semibold text-stone-800 text-sm block">{food.foodName}</span>
                              <span className="text-[11px] text-stone-400 block mt-0.5">{food.amount}</span>
                              <span className={`text-[9px] font-bold uppercase mt-2 w-fit px-1.5 py-0.5 rounded ${
                                food.isVegetarian ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {food.isVegetarian ? "Veg" : "Non-Veg"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Nutrient Intakes & Specialist Suggestions */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Demographic Recommended Daily intakes */}
            <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
              <h3 className="text-xl font-serif text-emerald-950 font-medium mb-6">Your Daily Nutrient Benchmarks</h3>
              <div className="space-y-6">
                {viewedReport.analysisResult.dailyNutrients && viewedReport.analysisResult.dailyNutrients.length > 0 ? (
                  viewedReport.analysisResult.dailyNutrients.map((nut, nIdx) => (
                    <div key={nIdx} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-stone-800">{nut.name}</span>
                        <span className="text-stone-500 font-medium">Recommended: {nut.recommendedIntake}</span>
                      </div>
                      
                      {/* Estimated Baseline Progress Bar */}
                      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-800 rounded-full" style={{ width: `${nut.progress}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-stone-400">
                        <span>Baseline Coverage</span>
                        <span>{nut.progress}%</span>
                      </div>

                      {/* Nutrient Whole food Sources */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {nut.sources.map((src, sIdx) => (
                          <span key={sIdx} className="text-[10px] font-semibold text-stone-500 bg-stone-50 border border-stone-150 px-2 py-0.5 rounded-md">
                            {src.foodName} ({src.quantity})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-400 text-sm italic">Nutritional requirements already fully optimized according to baseline profile.</p>
                )}
              </div>
            </div>

            {/* Specialist Consultation Recommendation Form */}
            <div className="bg-amber-50/20 border border-amber-200/60 rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-serif text-amber-950 font-medium mb-4 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-amber-800" />
                  Clinical Discussion Suggestions
                </h3>
                
                {viewedReport.analysisResult.specialistRecommendation ? (
                  <div className="space-y-4 text-base">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-900 block">Suggested Specialist:</span>
                      <p className="font-bold text-amber-950 text-lg">
                        {viewedReport.analysisResult.specialistRecommendation.specialist}
                      </p>
                    </div>

                    <div className="space-y-1 text-stone-700 leading-relaxed">
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-900 block">Reason for Suggestion:</span>
                      <p>{viewedReport.analysisResult.specialistRecommendation.reason}</p>
                    </div>

                    <div className="bg-white/80 border border-amber-250 rounded-xl p-3 text-xs text-stone-500 italic mt-4 leading-relaxed">
                      {viewedReport.analysisResult.specialistRecommendation.note}
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-500 text-sm">No secondary clinical specialists required. Routine checkups are suggested.</p>
                )}
              </div>

              {/* Start new Analysis */}
              <button
                onClick={handleClearViewed}
                className="mt-6 border border-amber-300 text-amber-900 hover:bg-amber-50 font-semibold py-3.5 px-4 rounded-xl shadow-sm transition-all text-base cursor-pointer"
              >
                Analyze Another Medical Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
