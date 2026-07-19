/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Eye, Globe, ShieldAlert, Trash2, Heart, Check, Loader2 } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onDeleteAccount: () => Promise<boolean>;
  onSignOut: () => void;
}

export default function Settings({ settings, onUpdateSettings, onDeleteAccount, onSignOut }: SettingsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleDarkMode = () => {
    onUpdateSettings({ ...settings, darkMode: !settings.darkMode });
  };

  const handleToggleNotifications = () => {
    onUpdateSettings({ ...settings, notifications: !settings.notifications });
  };

  const handleChangeLanguage = (lang: 'English' | 'Spanish' | 'French' | 'German' | 'Hindi' | 'Telugu' | 'Malayalam') => {
    onUpdateSettings({ ...settings, language: lang });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const success = await onDeleteAccount();
    setIsDeleting(false);
    setShowConfirm(false);
    if (success) {
      setShowSuccess(true);
    } else {
      alert("Failed to delete account data. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-serif text-emerald-950 font-medium mb-2">Workspace Settings</h1>
        <p className="text-stone-500">Configure your workspace preferences, visual adjustments, and personal clinical privacy guidelines.</p>
      </div>

      <div className="space-y-8">
        {/* Appearance & Workspace Preferences */}
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
          <h2 className="text-2xl font-serif text-emerald-950 font-medium mb-6 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-emerald-800" />
            Appearance & Experience
          </h2>

          <div className="divide-y divide-stone-100">
            {/* Color Mode / Aesthetic Toggle */}
            <div className="flex items-center justify-between py-5">
              <div>
                <h3 className="font-semibold text-stone-800 text-lg">Emerald Dark Contrast</h3>
                <p className="text-stone-500 text-sm">Convert the interface into an elegant dark emerald green theme.</p>
              </div>
              <button
                onClick={handleToggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.darkMode ? 'bg-emerald-800' : 'bg-stone-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notifications Toggle */}
            <div className="flex items-center justify-between py-5">
              <div>
                <h3 className="font-semibold text-stone-800 text-lg">Report Alerts</h3>
                <p className="text-stone-500 text-sm">Send dynamic desktop notifications when clinical analysis of uploaded documents completes.</p>
              </div>
              <button
                onClick={handleToggleNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.notifications ? 'bg-emerald-800' : 'bg-stone-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Language Selection */}
            <div className="flex items-center justify-between py-5">
              <div>
                <h3 className="font-semibold text-stone-800 text-lg">AI Translation Language</h3>
                <p className="text-stone-500 text-sm">Select language used for plain-English descriptions and summaries.</p>
              </div>
              <div className="relative">
                <select
                  value={settings.language}
                  onChange={(e) => handleChangeLanguage(e.target.value as any)}
                  className="bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-2 text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all appearance-none pr-8 cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español (Spanish)</option>
                  <option value="French">Français (French)</option>
                  <option value="German">Deutsch (German)</option>
                  <option value="Hindi">हिन्दी (Hindi)</option>
                  <option value="Telugu">తెలుగు (Telugu)</option>
                  <option value="Malayalam">മലയാളം (Malayalam)</option>
                </select>
                <Globe className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Medical Safety Disclaimer */}
        <div className="bg-amber-50/50 rounded-3xl border border-amber-200 p-8">
          <h2 className="text-2xl font-serif text-amber-950 font-medium mb-4 flex items-center gap-2">
            <Heart className="w-6 h-6 text-amber-700 fill-amber-700/20" />
            Medical Safety & Educational Notice
          </h2>
          <div className="space-y-3 text-amber-900/80 text-base leading-relaxed">
            <p>
              <strong>Nirva Clinical AI</strong> is designed strictly as an educational reference tool. It acts to extract and summarize medical documents using advanced language models to assist you in preparing questions for discussion with your doctor.
            </p>
            <p>
              This system <strong>never diagnoses diseases</strong>, <strong>never prescribes medication dosages</strong>, and <strong>must never replace</strong> professional medical examinations or the guidance of a licensed practitioner.
            </p>
            <p>
              If your analysis result highlights a <strong>Critical status</strong> or alert, we advise you to contact your General Practitioner or emergency healthcare services immediately.
            </p>
          </div>
        </div>

        {/* Privacy & Account Management */}
        <div className="bg-red-50/30 rounded-3xl border border-red-100 p-8 shadow-sm">
          <h2 className="text-2xl font-serif text-red-950 font-medium mb-6 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-800" />
            Privacy Controls & Account Status
          </h2>

          <div className="space-y-6">
            <div>
              <p className="text-stone-600 text-base mb-4 leading-relaxed">
                In compliance with general health data regulations (HIPAA, GDPR), you retain complete ownership over your uploaded documents and biometric details. Deleting your profile will permanently, securely, and irreversibly erase all user account metadata, clinical records, historical graphs, and conversation logs.
              </p>
              
              <button
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-750 text-white font-medium px-5 py-3 rounded-xl shadow-sm transition-all hover:shadow cursor-pointer border border-red-200 bg-red-700 hover:bg-red-800"
              >
                <Trash2 className="w-5 h-5" />
                Permanently Delete All My Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/55 backdrop-blur-xs" id="delete-confirm-modal">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <ShieldAlert className="w-8 h-8" />
              <h3 className="text-xl font-semibold font-serif text-stone-900">Irreversible Action Warning</h3>
            </div>
            
            <p className="text-stone-600 mb-6 text-sm leading-relaxed">
              Are you absolutely sure you want to proceed? <strong>All of your history of uploaded files, clinical health biomarkers, past chats, and account metadata will be permanently deleted.</strong> This action is safe, immediate, and cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-stone-200 rounded-xl text-stone-600 font-medium hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Permanently Delete Everything'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/55 backdrop-blur-xs" id="delete-success-modal">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 p-8 shadow-xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Check className="w-8 h-8" />
            </div>
            
            <h3 className="text-2xl font-semibold font-serif text-stone-900 mb-3">All Data Erased Successfully</h3>
            <p className="text-stone-600 mb-6 text-sm leading-relaxed">
              Your data is safe and not stored in records. Your profile history has been permanently purged from our servers.
            </p>

            <button
              onClick={() => {
                setShowSuccess(false);
                onSignOut();
              }}
              className="w-full py-3 bg-emerald-900 text-white font-medium rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer text-sm"
            >
              OK, Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
