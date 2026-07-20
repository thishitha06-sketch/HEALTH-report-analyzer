/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, UserProfile as ProfileType } from '../types';
import { User as UserIcon, Save, Info, CheckCircle2, Plus, Trash2, Users, ArrowLeft } from 'lucide-react';

interface UserProfileProps {
  user: User;
  onUpdateProfile: (profile: ProfileType) => Promise<void>;
  onAddProfile: (profile: ProfileType) => Promise<void>;
  onDeleteProfile: (profileId: string) => Promise<void>;
  onSelectProfile: (profileId: string) => Promise<void>;
}

const DEFAULT_NEW_PROFILE: ProfileType = {
  name: '',
  age: 30,
  gender: 'Female',
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
  },
  relationship: 'Family'
};

export default function UserProfile({
  user,
  onUpdateProfile,
  onAddProfile,
  onDeleteProfile,
  onSelectProfile
}: UserProfileProps) {
  const [activeProfileId, setActiveProfileId] = useState<string>(user.profile.id || 'profile-main');
  const [editingProfile, setEditingProfile] = useState<ProfileType>({ ...user.profile });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchronize state when the active profile changes or user updates
  useEffect(() => {
    if (isAddingNew) return;

    const allProfiles = user.profiles || [user.profile];
    const active = allProfiles.find(p => p.id === user.profile.id) || user.profile;
    setEditingProfile({ ...active });
    setActiveProfileId(active.id || 'profile-main');
  }, [user, isAddingNew]);

  const handleStartAddProfile = () => {
    setIsAddingNew(true);
    setEditingProfile({
      ...DEFAULT_NEW_PROFILE,
      id: `profile-${Math.random().toString(36).substr(2, 9)}`
    });
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    const allProfiles = user.profiles || [user.profile];
    const active = allProfiles.find(p => p.id === user.profile.id) || user.profile;
    setEditingProfile({ ...active });
  };

  const handleSelectProfile = async (profileId: string) => {
    if (isAddingNew) {
      setIsAddingNew(false);
    }
    await onSelectProfile(profileId);
  };

  const handleDeleteClick = async (profileId: string) => {
    if (window.confirm("Are you sure you want to delete this profile? All medical reports analyzed under this profile will remain, but the baseline profile will be permanently removed.")) {
      try {
        await onDeleteProfile(profileId);
      } catch (err) {
        alert("Failed to delete profile.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (isAddingNew) {
        await onAddProfile(editingProfile);
        setIsAddingNew(false);
        setSaveSuccess(true);
      } else {
        await onUpdateProfile(editingProfile);
        setSaveSuccess(true);
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const allProfiles = user.profiles || [user.profile];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" id="user-profile-section">
      {/* Page Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 font-medium mb-2 flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-800" />
            Health Profiles
          </h1>
          <p className="text-stone-500 max-w-2xl">
            Keep health baselines updated for yourself and your loved ones. The AI automatically customizes reference ranges, analysis insights, and dietary recommendations for the active profile.
          </p>
        </div>
      </div>

      {/* Profiles Selection Area */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm mb-8" id="profiles-selector-box">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-serif text-emerald-950 font-medium">Family & Friends Profiles</h2>
            <p className="text-stone-500 text-sm">Select an active profile to customize report analysis and chat companion guidance.</p>
          </div>
          {!isAddingNew && (
            <button
              type="button"
              onClick={handleStartAddProfile}
              className="bg-[#3a7d6e] hover:bg-[#2d6155] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto shadow-sm"
              id="add-profile-btn"
            >
              <Plus className="w-4 h-4" />
              Add Friend/Family
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProfiles.map((p) => {
            const isActive = p.id === activeProfileId && !isAddingNew;
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border p-4 transition-all cursor-pointer flex items-center justify-between group ${
                  isActive
                    ? 'border-emerald-800 bg-emerald-50/40 ring-1 ring-emerald-800'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/10'
                }`}
                onClick={() => handleSelectProfile(p.id || 'profile-main')}
                id={`profile-card-${p.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                      {p.name}
                      {p.relationship === 'Self' && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded-full">
                          Self
                        </span>
                      )}
                    </div>
                    <div className="text-stone-500 text-xs">
                      {p.relationship !== 'Self' ? p.relationship : 'Primary'} • {p.age} yrs • {p.gender}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isActive && (
                    <span className="text-xs text-emerald-800 font-semibold bg-emerald-100/50 px-2 py-0.5 rounded-lg">
                      Active
                    </span>
                  )}
                  {p.relationship !== 'Self' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(p.id || '');
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                      title="Delete Profile"
                      id={`delete-btn-${p.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-8" id="profile-details-form">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
            <h2 className="text-2xl font-serif text-emerald-950 font-medium flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-emerald-800" />
              {isAddingNew ? "New Health Profile" : `Biological Baseline: ${editingProfile.name}`}
            </h2>
            {isAddingNew && (
              <button
                type="button"
                onClick={handleCancelAdd}
                className="text-stone-500 hover:text-stone-800 flex items-center gap-1 text-sm font-medium transition-all"
                id="cancel-add-profile-btn"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block">Full Name</label>
              <input
                type="text"
                required
                value={editingProfile.name}
                onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all placeholder:text-stone-300 text-stone-800"
                placeholder="E.g. John Doe"
                id="profile-name-input"
              />
            </div>

            {/* Relationship to Owner (visible only when not Self/Primary) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block">Relationship to You</label>
              <select
                disabled={editingProfile.relationship === 'Self'}
                value={editingProfile.relationship || 'Family'}
                onChange={(e) => setEditingProfile({ ...editingProfile, relationship: e.target.value as any })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800 disabled:opacity-60 disabled:cursor-not-allowed appearance-none cursor-pointer"
                id="profile-relationship-select"
              >
                <option value="Self">Self (Primary Account Holder)</option>
                <option value="Family">Family Member</option>
                <option value="Spouse">Spouse / Partner</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Age */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block">Age (Years)</label>
              <input
                type="number"
                required
                min="1"
                max="120"
                value={editingProfile.age || ''}
                onChange={(e) => setEditingProfile({ ...editingProfile, age: Math.max(1, Number(e.target.value)) })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800"
                placeholder="30"
                id="profile-age-input"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block">Biological Sex</label>
              <select
                value={editingProfile.gender}
                onChange={(e) => setEditingProfile({ ...editingProfile, gender: e.target.value as any })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800 appearance-none cursor-pointer"
                id="profile-gender-select"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other / Decline to State</option>
              </select>
            </div>

            {/* Activity Level */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block">Activity Level</label>
              <select
                value={editingProfile.activityLevel || 'Sedentary'}
                onChange={(e) => setEditingProfile({ ...editingProfile, activityLevel: e.target.value as any })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800 appearance-none cursor-pointer"
                id="profile-activity-level-select"
              >
                <option value="Sedentary">Sedentary (Little or no exercise)</option>
                <option value="Lightly Active">Lightly Active (Light exercise 1-3 days/week)</option>
                <option value="Moderately Active">Moderately Active (Moderate exercise 3-5 days/week)</option>
                <option value="Very Active">Very Active (Hard exercise 6-7 days/week)</option>
              </select>
            </div>

            {/* Pregnancy / Lactation Status */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block">Pregnancy / Lactation Status (if applicable)</label>
              <select
                value={editingProfile.pregnancyStatus || 'Not Applicable'}
                onChange={(e) => setEditingProfile({ ...editingProfile, pregnancyStatus: e.target.value as any })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800 appearance-none cursor-pointer"
                id="profile-pregnancy-status-select"
              >
                <option value="Not Applicable">Not Applicable / Male</option>
                <option value="Pregnant">Pregnant</option>
                <option value="Lactating">Lactating</option>
              </select>
            </div>

            {/* Height / Weight Combined */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-600 block">Height (cm)</label>
                <input
                  type="number"
                  required
                  min="30"
                  max="250"
                  value={editingProfile.height || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, height: Number(e.target.value) })}
                  className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800"
                  id="profile-height-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-600 block">Weight (kg)</label>
                <input
                  type="number"
                  required
                  min="5"
                  max="400"
                  value={editingProfile.weight || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, weight: Number(e.target.value) })}
                  className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800"
                  id="profile-weight-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Notes & History */}
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
          <h2 className="text-2xl font-serif text-emerald-950 font-medium mb-6 flex items-center gap-2">
            <Info className="w-6 h-6 text-emerald-800" />
            Medical History & Lifestyle Context
          </h2>

          <div className="space-y-6">
            {/* Allergies */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block flex items-center gap-1.5">
                Allergies & Sensitivities <span className="text-stone-400 font-normal">(e.g. Penicillin, gluten, dairy)</span>
              </label>
              <textarea
                value={editingProfile.allergies}
                onChange={(e) => setEditingProfile({ ...editingProfile, allergies: e.target.value })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800 h-24 placeholder:text-stone-300"
                placeholder="E.g. No known medical or food allergies."
                id="profile-allergies-textarea"
              />
            </div>

            {/* Medical History */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block">Known Chronic Conditions / Surgical History</label>
              <textarea
                value={editingProfile.medicalHistory}
                onChange={(e) => setEditingProfile({ ...editingProfile, medicalHistory: e.target.value })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800 h-24 placeholder:text-stone-300"
                placeholder="E.g. Healthy overall, routine physicals up to date."
                id="profile-history-textarea"
              />
            </div>

            {/* Lifestyle preferences */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-600 block flex items-center gap-1.5">
                Dietary & Lifestyle Preferences <span className="text-stone-400 font-normal">(Used for food recommendations)</span>
              </label>
              <textarea
                value={editingProfile.lifestylePreferences}
                onChange={(e) => setEditingProfile({ ...editingProfile, lifestylePreferences: e.target.value })}
                className="w-full bg-[#FBF9F6] border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800 h-24 placeholder:text-stone-300"
                placeholder="E.g. Prefers plant-focused diets, sleeps 7-8 hours daily, moderately active."
                id="profile-lifestyle-textarea"
              />
            </div>
          </div>
        </div>

        {/* Sharing & Privacy Settings */}
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
          <h2 className="text-2xl font-serif text-emerald-950 font-medium mb-6">Profile Privacy Settings</h2>
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editingProfile.privacySettings?.shareWithDoctor ?? true}
                onChange={(e) => setEditingProfile({
                  ...editingProfile,
                  privacySettings: { ...(editingProfile.privacySettings || { shareWithDoctor: true, anonymousResearch: false }), shareWithDoctor: e.target.checked }
                })}
                className="mt-1 h-5 w-5 rounded border-stone-300 text-emerald-800 focus:ring-emerald-500"
                id="share-with-doctor-checkbox"
              />
              <div>
                <span className="font-semibold text-stone-800">Allow Doctor Sharing</span>
                <p className="text-stone-500 text-sm">Generate structured summary documents optimized for sharing during regular clinic appointments.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editingProfile.privacySettings?.anonymousResearch ?? false}
                onChange={(e) => setEditingProfile({
                  ...editingProfile,
                  privacySettings: { ...(editingProfile.privacySettings || { shareWithDoctor: true, anonymousResearch: false }), anonymousResearch: e.target.checked }
                })}
                className="mt-1 h-5 w-5 rounded border-stone-300 text-emerald-800 focus:ring-emerald-500"
                id="anonymous-research-checkbox"
              />
              <div>
                <span className="font-semibold text-stone-800">Contribute Anonymized Data to Health Research</span>
                <p className="text-stone-500 text-sm">Contribute fully de-identified biomarker trends to safe lifestyle medicine statistics.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#3a7d6e] hover:bg-[#2d6155] text-white font-medium text-lg px-8 py-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:bg-stone-300"
            id="save-profile-details-btn"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Saving Baseline..." : isAddingNew ? "Create Health Profile" : "Save Baseline Profile"}
          </button>

          {saveSuccess && (
            <div className="flex items-center gap-2 text-emerald-700 font-medium animate-fade-in" id="save-success-indicator">
              <CheckCircle2 className="w-5 h-5" />
              {isAddingNew ? "Profile successfully created!" : "Baseline successfully saved!"}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
