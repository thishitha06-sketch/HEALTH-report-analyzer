/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MedicalReport, BiomarkerStatus } from '../types';
import { Activity, Calendar, Plus, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';

interface HistoryTrendsProps {
  reports: MedicalReport[];
  manualBloodPressures: { date: string; systolic: number; diastolic: number }[];
  onAddBloodPressure: (systolic: number, diastolic: number) => void;
}

export default function HistoryTrends({ reports, manualBloodPressures, onAddBloodPressure }: HistoryTrendsProps) {
  const [selectedMarker, setSelectedMarker] = useState<string>("Hemoglobin");
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [bpSuccess, setBpSuccess] = useState(false);

  // List of trace-ready markers
  const trackableMarkers = [
    "Hemoglobin",
    "Vitamin D3 (25-Hydroxy)",
    "Serum Creatinine",
    "Fasting Blood Glucose",
    "Total Cholesterol",
    "Blood Pressure"
  ];

  // Extract marker historical values from all reports
  const getMarkerDataPoints = () => {
    if (selectedMarker === "Blood Pressure") {
      return manualBloodPressures.map(bp => ({
        date: new Date(bp.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: bp.systolic,
        secondaryValue: bp.diastolic,
        status: (bp.systolic > 140 || bp.diastolic > 90) ? "High" : "Normal"
      }));
    }

    const points: { date: string; value: number; rawValue: string; status: BiomarkerStatus }[] = [];
    
    // Sort reports chronologically
    const sortedReports = [...reports].sort((a, b) => 
      new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
    );

    sortedReports.forEach(report => {
      const marker = report.analysisResult.biomarkers.find(b => 
        b.name.toLowerCase().includes(selectedMarker.toLowerCase())
      );
      if (marker) {
        points.push({
          date: new Date(report.uploadDate).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          value: marker.value || Number(marker.rawValue) || 0,
          rawValue: marker.rawValue,
          status: marker.status
        });
      }
    });

    return points;
  };

  const handleBpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sys = Number(bpSystolic);
    const dia = Number(bpDiastolic);
    if (sys > 50 && sys < 250 && dia > 30 && dia < 150) {
      onAddBloodPressure(sys, dia);
      setBpSystolic('');
      setBpDiastolic('');
      setBpSuccess(true);
      setTimeout(() => setBpSuccess(false), 3000);
    } else {
      alert("Please enter reasonable values for Blood Pressure (e.g., 120 / 80).");
    }
  };

  const dataPoints = getMarkerDataPoints();

  // Helper to determine status color matches
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'bg-green-500';
      case 'Borderline': return 'bg-yellow-500';
      case 'High': return 'bg-orange-500';
      case 'Low': return 'bg-red-500';
      case 'Critical': return 'bg-red-800';
      default: return 'bg-stone-300';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'text-green-700 bg-green-50';
      case 'Borderline': return 'text-yellow-700 bg-yellow-50';
      case 'High': return 'text-orange-700 bg-orange-50';
      case 'Low': return 'text-red-700 bg-red-50';
      case 'Critical': return 'text-red-900 bg-red-100';
      default: return 'text-stone-500 bg-stone-100';
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-serif text-emerald-950 font-medium mb-2">Historical Biometrics</h1>
        <p className="text-stone-500">Analyze comparative biological trends, track your healing milestones, and view historical medical logs.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Control Column: Markers Selector & Manual Blood Pressure entry */}
        <div className="space-y-6 lg:col-span-1">
          {/* Biomarkers Directory */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-800" />
              Biomarkers Tracked
            </h2>
            <div className="space-y-1">
              {trackableMarkers.map((marker) => {
                const isActive = selectedMarker === marker;
                return (
                  <button
                    key={marker}
                    onClick={() => setSelectedMarker(marker)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all font-medium text-left cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-900 text-white shadow-md' 
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>{marker}</span>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Entry for Blood Pressure */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-800" />
              Log Blood Pressure
            </h2>
            <p className="text-stone-500 text-xs mb-4">Keep a regular log of your resting Blood Pressure values.</p>

            <form onSubmit={handleBpSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-500">Systolic (mmHg)</label>
                  <input
                    type="number"
                    required
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    placeholder="120"
                    className="w-full bg-[#FBF9F6] border border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-900 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-500">Diastolic (mmHg)</label>
                  <input
                    type="number"
                    required
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    placeholder="80"
                    className="w-full bg-[#FBF9F6] border border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-900 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-medium py-2 px-4 rounded-xl shadow-sm transition-all text-sm cursor-pointer"
              >
                Log Entry
              </button>
              
              {bpSuccess && (
                <p className="text-center text-xs text-green-700 font-medium">BP reading saved successfully!</p>
              )}
            </form>
          </div>
        </div>

        {/* Right Content Column: Custom Interactive Comparison Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest block mb-1">Interactive Comparison</span>
                <h2 className="text-2xl font-serif text-emerald-950 font-medium">{selectedMarker} Timeline</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/50 px-3 py-1.5 rounded-lg border border-emerald-100 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Dynamic Calibration
              </div>
            </div>

            {/* Empty States Handling */}
            {dataPoints.length === 0 ? (
              <div className="py-20 text-center max-w-sm mx-auto">
                <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h4 className="font-semibold text-stone-800 text-lg mb-1">No historical datapoints yet</h4>
                <p className="text-stone-400 text-sm">Upload more than one medical report containing this biomarker to begin tracking comparison curves.</p>
              </div>
            ) : (
              <div>
                {/* Custom Interactive SVG Line Plot (Self-Sizing, responsive, pixel-perfect, clean CSS) */}
                <div className="relative h-64 w-full bg-[#FBF9F6] rounded-2xl border border-stone-150 p-6 mb-8 flex flex-col justify-between">
                  
                  {/* Visual Lines Plot overlay */}
                  <div className="relative flex-1 flex items-end justify-between px-10 h-40">
                    
                    {/* Background Grids */}
                    <div className="absolute inset-x-0 top-0 h-px bg-stone-200/50"></div>
                    <div className="absolute inset-x-0 top-1/2 h-px bg-stone-200/50"></div>
                    
                    {/* SVG Connector Line */}
                    {dataPoints.length > 1 && (
                      <svg className="absolute inset-0 w-full h-full p-6 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path
                          d={dataPoints.map((dp, idx) => {
                            const x = (idx / (dataPoints.length - 1)) * 100;
                            // Scale values from 10 to 90
                            const minVal = Math.min(...dataPoints.map(p => p.value));
                            const maxVal = Math.max(...dataPoints.map(p => p.value));
                            const range = maxVal - minVal || 1;
                            const y = 90 - ((dp.value - minVal) / range) * 80;
                            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#064e3b"
                          strokeWidth="2"
                        />
                      </svg>
                    )}

                    {/* Datapoints markers */}
                    {dataPoints.map((dp, idx) => (
                      <div key={idx} className="relative flex flex-col items-center group z-10">
                        {/* Hover Tooltip card */}
                        <div className="absolute bottom-12 bg-emerald-950 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow">
                          Value: {dp.rawValue || dp.value} {selectedMarker === 'Blood Pressure' ? 'sys' : ''}
                        </div>
                        
                        {/* Point Bubble */}
                        <div className={`w-4.5 h-4.5 rounded-full border-4 border-white shadow-sm cursor-pointer hover:scale-125 transition-transform ${getStatusColor(dp.status || 'Normal')}`} />
                        
                        <span className="text-xs font-semibold text-stone-700 mt-2 block">{dp.value}</span>
                        {selectedMarker === "Blood Pressure" && dp.secondaryValue && (
                          <span className="text-[10px] text-stone-400">/ {dp.secondaryValue} dia</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Datapoints Dates labels */}
                  <div className="flex justify-between items-center px-8 border-t border-stone-200/50 pt-3 text-[11px] font-semibold text-stone-400">
                    {dataPoints.map((dp, idx) => (
                      <span key={idx}>{dp.date}</span>
                    ))}
                  </div>
                </div>

                {/* Table Comparison breakdown */}
                <div>
                  <h3 className="text-lg font-semibold text-stone-800 mb-4">Historical Records</h3>
                  <div className="bg-white border border-stone-150 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#FBF9F6] border-b border-stone-150 text-xs font-bold text-stone-400 uppercase tracking-widest">
                          <th className="py-4 px-6">Evaluation Date</th>
                          <th className="py-4 px-6">Result Value</th>
                          <th className="py-4 px-6">Demographic Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-150 text-sm text-stone-700">
                        {dataPoints.slice().reverse().map((dp, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                            <td className="py-4 px-6 font-medium flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-stone-400" />
                              {dp.date}
                            </td>
                            <td className="py-4 px-6 font-mono font-semibold">
                              {dp.rawValue || dp.value} {selectedMarker === 'Blood Pressure' && dp.secondaryValue ? ` / ${dp.secondaryValue}` : ''}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusTextColor(dp.status || 'Normal')}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(dp.status || 'Normal')}`} />
                                {dp.status || 'Normal'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
