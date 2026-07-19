/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MedicalReport, Biomarker, BiomarkerStatus } from '../types';
import { Activity, ShieldAlert, Heart, Calendar, Plus, Eye, ChevronRight, Apple, Clock, Bell, Trash2 } from 'lucide-react';

interface DashboardProps {
  reports: MedicalReport[];
  onViewReport: (report: MedicalReport) => void;
  onNavigateToTab: (tab: string) => void;
}

interface FollowUpReminder {
  id: string;
  title: string;
  date: string;
  specialist: string;
}

export default function Dashboard({ reports, onViewReport, onNavigateToTab }: DashboardProps) {
  // Follow-ups configured by user (in-memory state, seed with one example)
  const [reminders, setReminders] = useState<FollowUpReminder[]>([
    { id: 'rem-1', title: 'Routine GP Blood Re-test', date: '2026-08-15', specialist: 'General Physician' }
  ]);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderSpecialist, setNewReminderSpecialist] = useState('General Physician');
  const [showAddReminder, setShowAddReminder] = useState(false);

  // Extract abnormal findings across ALL reports
  const getAbnormalFindings = (): { biomarker: Biomarker; reportTitle: string; date: string }[] => {
    const list: { biomarker: Biomarker; reportTitle: string; date: string }[] = [];
    reports.forEach(report => {
      report.analysisResult.biomarkers.forEach(b => {
        if (['Low', 'High', 'Critical', 'Borderline'].includes(b.status)) {
          list.push({
            biomarker: b,
            reportTitle: report.analysisResult.title,
            date: new Date(report.uploadDate).toLocaleDateString()
          });
        }
      });
    });
    // Return sorted by critical/abnormal severity
    return list.slice(0, 5);
  };

  // Get count of normal findings
  const getNormalFindingsCount = () => {
    let count = 0;
    reports.forEach(report => {
      report.analysisResult.biomarkers.forEach(b => {
        if (b.status === 'Normal') count++;
      });
    });
    return count;
  };

  // Get most recent report overall health score
  const getLatestHealthScore = () => {
    if (reports.length === 0) return 100;
    const sorted = [...reports].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    return sorted[0].analysisResult.overallHealthScore;
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReminderTitle && newReminderDate) {
      const newRem: FollowUpReminder = {
        id: 'rem-' + Date.now(),
        title: newReminderTitle,
        date: newReminderDate,
        specialist: newReminderSpecialist
      };
      setReminders([...reminders, newRem]);
      setNewReminderTitle('');
      setNewReminderDate('');
      setShowAddReminder(false);
    }
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const latestScore = getLatestHealthScore();
  const abnormalFindings = getAbnormalFindings();
  const normalCount = getNormalFindingsCount();

  const getScoreColorClasses = (score: number) => {
    if (score >= 90) return { text: 'text-green-700', bg: 'bg-green-500/10', circle: 'border-green-600', msg: 'Optimal health score. Your lifestyle parameters look solid.' };
    if (score >= 75) return { text: 'text-yellow-700', bg: 'bg-yellow-500/10', circle: 'border-yellow-600', msg: 'Good baseline. Minor borderline parameters require attention.' };
    if (score >= 50) return { text: 'text-orange-700', bg: 'bg-orange-500/10', circle: 'border-orange-600', msg: 'Moderate bio-corrections suggested. Review nutrients & movement.' };
    return { text: 'text-red-700', bg: 'bg-red-500/10', circle: 'border-red-600', msg: 'Attention recommended. Key critical indicators require review.' };
  };

  const getStatusBadge = (status: BiomarkerStatus) => {
    switch (status) {
      case 'Normal': return 'text-green-700 bg-green-50 border-green-200';
      case 'Borderline': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Low': return 'text-red-700 bg-red-50 border-red-200';
      case 'Critical': return 'text-red-900 bg-red-100 border-red-300';
      default: return 'text-stone-500 bg-stone-50 border-stone-200';
    }
  };

  const scoreMeta = getScoreColorClasses(latestScore);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 font-medium mb-1">Health Dashboard</h1>
          <p className="text-stone-500">Welcome back, Emily. Here is a real-time summary of your clinical records and health targets.</p>
        </div>
        <button
          onClick={() => onNavigateToTab('analyze')}
          className="bg-emerald-900 hover:bg-emerald-800 text-white font-medium px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer text-sm"
        >
          <Plus className="w-5 h-5" />
          Upload New Report
        </button>
      </div>

      {/* Bento Grid Layer 1 */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Overall Health Score Gauge Card */}
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest block mb-6">Overall Health Score</span>
          
          {/* Gauge representation */}
          <div className={`relative w-40 h-40 rounded-full border-12 flex items-center justify-center mb-6 shadow-inner ${scoreMeta.circle} ${scoreMeta.bg}`}>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-serif font-bold text-stone-800">{reports.length === 0 ? "—" : latestScore}</span>
              <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mt-1">Grade index</span>
            </div>
          </div>
          
          <p className="text-stone-600 text-sm leading-relaxed font-medium">
            {reports.length === 0 ? "Upload a medical report to calculate your initial overall health score." : scoreMeta.msg}
          </p>
        </div>

        {/* Recent Alerts & Abnormal Markers */}
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-emerald-950 font-medium flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-800" />
                Active Biological Alerts
              </h2>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider bg-stone-50 border border-stone-150 px-2.5 py-1 rounded-md">
                {abnormalFindings.length} alert(s)
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm italic">
                No diagnostic alerts registered. Connect medical panel documents to scan.
              </div>
            ) : (
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                {abnormalFindings.map((find, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3.5 border border-stone-150 rounded-xl hover:bg-stone-50/50 transition-colors text-sm">
                    <div className="space-y-1">
                      <span className="font-bold text-stone-800 block">{find.biomarker.name}</span>
                      <span className="text-[11px] text-stone-400 block">
                        Value: {find.biomarker.rawValue} {find.biomarker.unit} (Ref: {find.biomarker.referenceRange}) • {find.reportTitle}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(find.biomarker.status)}`}>
                      {find.biomarker.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-stone-100 pt-4 flex items-center justify-between text-xs text-stone-500 mt-4">
            <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-emerald-800 fill-emerald-800/10" /> {normalCount} Normal Markers Evaluated</span>
            <button onClick={() => onNavigateToTab('trends')} className="text-emerald-900 hover:underline font-semibold flex items-center gap-0.5">
              View History Trends <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Layer 2 */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Recent Reports Listing Panel */}
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-serif text-emerald-950 font-medium mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-800" />
              Recent Documents
            </h2>
            
            {reports.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm italic">
                No uploads yet. Drag & drop files in the Analyzer.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-2">
                {reports.slice(0, 4).map((report) => (
                  <div 
                    key={report.id}
                    onClick={() => onViewReport(report)}
                    className="flex items-center justify-between p-3 border border-stone-150 rounded-xl hover:border-emerald-700 hover:bg-emerald-50/10 transition-all cursor-pointer text-sm"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-lg bg-[#FBF9F6] border border-stone-200 flex items-center justify-center text-stone-500 flex-shrink-0">
                        📄
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-stone-800 block truncate">{report.analysisResult.title || report.fileName}</span>
                        <span className="text-[10px] text-stone-400 block mt-0.5">{new Date(report.uploadDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Eye className="w-4.5 h-4.5 text-stone-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('analyze')}
            className="w-full border border-stone-200 hover:bg-stone-50 font-semibold py-2.5 rounded-xl text-stone-700 transition-colors text-xs mt-6"
          >
            Upload Workspace
          </button>
        </div>

        {/* Nutritional & Deficiencies Goals Card */}
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-serif text-emerald-950 font-medium mb-6 flex items-center gap-2">
              <Apple className="w-5 h-5 text-emerald-800" />
              Nutritional Status
            </h2>

            {reports.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm italic">
                Configure diet targets. Upload blood reports to load vitamin levels.
              </div>
            ) : (
              <div className="space-y-4">
                {reports[0].analysisResult.dailyNutrients?.slice(0, 3).map((nut, index) => (
                  <div key={index} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold text-stone-700">
                      <span>{nut.name}</span>
                      <span>Target: {nut.recommendedIntake}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-800 rounded-full" style={{ width: `${nut.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-400 font-medium mt-0.5">
                      <span>Dietary baseline coverage</span>
                      <span>{nut.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('profile')}
            className="w-full border border-stone-200 hover:bg-stone-50 font-semibold py-2.5 rounded-xl text-stone-700 transition-colors text-xs mt-6"
          >
            Adjust Dietary Preferences
          </button>
        </div>

        {/* User-Only Reminders & Clinical Follow-ups */}
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-emerald-950 font-medium flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-800" />
                Follow-up Reminders
              </h2>
              <button 
                onClick={() => setShowAddReminder(!showAddReminder)}
                className="text-emerald-900 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 text-xs font-bold"
              >
                {showAddReminder ? "Cancel" : "Add"}
              </button>
            </div>

            {showAddReminder && (
              <form onSubmit={handleAddReminder} className="space-y-3 bg-[#FBF9F6] p-4 rounded-xl border border-stone-200 mb-4 animate-fade-in text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-500">Reminder Title</label>
                  <input
                    type="text"
                    required
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    placeholder="E.g., Anemia Follow-up Test"
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 text-xs focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-500">Target Date</label>
                    <input
                      type="date"
                      required
                      value={newReminderDate}
                      onChange={(e) => setNewReminderDate(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-500">Specialist Type</label>
                    <select
                      value={newReminderSpecialist}
                      onChange={(e) => setNewReminderSpecialist(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-stone-850 text-xs focus:outline-none"
                    >
                      <option value="General Physician">General Physician</option>
                      <option value="Cardiologist">Cardiologist</option>
                      <option value="Endocrinologist">Endocrinologist</option>
                      <option value="Orthopedic">Orthopedic Surgeon</option>
                      <option value="Hematologist">Hematologist</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-900 text-white font-medium py-1.5 rounded-lg text-xs hover:bg-emerald-800 cursor-pointer"
                >
                  Save Reminder
                </button>
              </form>
            )}

            <div className="space-y-3 max-h-[190px] overflow-y-auto pr-2">
              {reminders.map((rem) => (
                <div key={rem.id} className="flex justify-between items-center p-3 border border-stone-150 rounded-xl text-xs hover:bg-stone-50/50 transition-colors">
                  <div className="space-y-1">
                    <span className="font-bold text-stone-800 block">{rem.title}</span>
                    <span className="text-[10px] text-stone-400 block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      Due: {new Date(rem.date).toLocaleDateString()} • {rem.specialist}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteReminder(rem.id)}
                    className="p-1 text-stone-400 hover:text-red-700 rounded transition-colors"
                    title="Remove reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {reminders.length === 0 && (
                <p className="text-center text-stone-400 text-xs italic py-4">No follow-up reminders configured.</p>
              )}
            </div>
          </div>

          <p className="text-[10px] text-stone-400 italic text-center mt-4">Reminders above are configured locally for user convenience only.</p>
        </div>

      </div>
    </div>
  );
}
