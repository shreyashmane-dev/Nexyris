import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Check, User, Sparkles, Brain, Shield, Info } from 'lucide-react';
import { UserProfile, UserMemory } from '../../types';
import { fetchUserProfile, saveUserProfile, fetchUserMemories, addUserMemory, deleteUserMemory } from '../../lib/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

const EMOJI_OPTIONS = ['🚀', '⚡', '🤖', '🧠', '🪐', '🛡️', '💻', '🔮', '🌟', '🎯'];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onProfileUpdated }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'memories'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🚀');
  const [customInstructions, setCustomInstructions] = useState('');

  // New Memory State
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemValue, setNewMemValue] = useState('');
  const [newMemCategory, setNewMemCategory] = useState<'preference' | 'fact' | 'project' | 'personal'>('preference');
  const [addingMemory, setAddingMemory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const p = await fetchUserProfile();
      setProfile(p);
      setName(p.name || '');
      setTitle(p.title || '');
      setBio(p.bio || '');
      setAvatarEmoji(p.avatar_emoji || '🚀');
      setCustomInstructions(p.custom_instructions || '');

      const m = await fetchUserMemories();
      setMemories(m);
    } catch (e) {
      console.error('Failed to load user profile data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const updated = await saveUserProfile({
        name: name.trim() || 'Explorer',
        title: title.trim(),
        bio: bio.trim(),
        avatar_emoji: avatarEmoji,
        custom_instructions: customInstructions.trim(),
      });
      setProfile(updated);
      if (onProfileUpdated) onProfileUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e: any) {
      alert('Failed to save profile: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemValue.trim()) return;

    try {
      setAddingMemory(true);
      const created = await addUserMemory({
        category: newMemCategory,
        key: newMemKey.trim() || 'General Fact',
        value: newMemValue.trim(),
      });
      setMemories(prev => [created, ...prev]);
      setNewMemKey('');
      setNewMemValue('');
    } catch (e: any) {
      alert('Failed to add memory: ' + e.message);
    } finally {
      setAddingMemory(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteUserMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (e: any) {
      alert('Failed to delete memory: ' + e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-container-highest flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shadow-xs">
              {avatarEmoji}
            </div>
            <div>
              <h3 className="font-headline-md text-base font-semibold text-on-surface">
                User Profile & Persona Memory
              </h3>
              <p className="font-body-sm text-xs text-secondary">
                Saved securely in local SQLite database on your USB drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-container-highest px-6 bg-surface-container-lowest">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-4 font-body-sm text-sm font-medium border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 ${
              activeTab === 'profile'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            <User size={15} />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('memories')}
            className={`flex items-center gap-2 py-3 px-4 font-body-sm text-sm font-medium border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 ${
              activeTab === 'memories'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            <Brain size={15} />
            <span>AI Memories & Facts</span>
            <span className="font-label-telemetry text-xs px-1.5 py-0.2 rounded-full bg-surface-container text-secondary">
              {memories.length}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-5">
              {/* Avatar Selector */}
              <div>
                <label className="font-body-sm text-xs font-semibold text-secondary uppercase tracking-wider block mb-2">
                  Choose Avatar Emoji
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                        avatarEmoji === emoji
                          ? 'bg-primary/20 border-2 border-primary scale-110 shadow-xs'
                          : 'bg-surface-container-low border border-surface-container-highest hover:bg-surface-container'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name and Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-body-sm text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">
                    Your Name / Display Alias
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex, CyberDev, Neo"
                    className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-on-surface font-body-md text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="font-body-sm text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">
                    Role or Specialization
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Full-Stack Engineer, Security Analyst"
                    className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-on-surface font-body-md text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="font-body-sm text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">
                  About You & Background
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the local AI about your background, tools, and technical focus..."
                  className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-on-surface font-body-md text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Custom AI Instructions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-body-sm text-xs font-semibold text-secondary uppercase tracking-wider">
                    Custom System Persona Instructions
                  </label>
                  <span className="font-label-telemetry text-[11px] text-secondary">
                    Auto-injected into every AI session
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Always write clean TypeScript with types. Be concise and prioritize high-performance algorithms. Address me as chief engineer."
                  className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low border border-surface-container-highest text-on-surface font-body-md text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium animate-in fade-in">
                    <Check size={14} /> Profile Saved to SQLite!
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white font-body-sm text-sm font-semibold hover:bg-primary-container transition-all shadow-sm cursor-pointer border-none disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'memories' && (
            <div className="flex flex-col gap-5">
              {/* Add Memory Form */}
              <form onSubmit={handleAddMemory} className="bg-surface-container-low p-4 rounded-xl border border-surface-container-highest flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-headline-md text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={14} className="text-primary" /> Teach AI a New Fact About You
                  </span>
                  <select
                    value={newMemCategory}
                    onChange={(e: any) => setNewMemCategory(e.target.value)}
                    className="bg-surface-container-lowest border border-surface-container-highest rounded-md px-2 py-1 text-xs text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value="preference">Preference</option>
                    <option value="fact">Personal Fact</option>
                    <option value="project">Active Project</option>
                    <option value="personal">Style Rule</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newMemKey}
                    onChange={(e) => setNewMemKey(e.target.value)}
                    placeholder="Fact Topic (e.g. Favorite Language)"
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={newMemValue}
                    onChange={(e) => setNewMemValue(e.target.value)}
                    placeholder="Details (e.g. Prefers Rust & TypeScript)"
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingMemory || !newMemValue.trim()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer border-none disabled:opacity-50"
                  >
                    <Plus size={13} />
                    <span>{addingMemory ? 'Remembering...' : 'Remember Fact'}</span>
                  </button>
                </div>
              </form>

              {/* Memory List */}
              <div className="flex flex-col gap-2">
                <span className="font-body-sm text-xs font-semibold text-secondary uppercase tracking-wider">
                  Persistent Memories ({memories.length})
                </span>

                {memories.length === 0 ? (
                  <div className="py-8 text-center text-secondary font-body-sm text-xs border border-dashed border-surface-container-highest rounded-xl">
                    No memories saved yet. Add facts above to personalize your offline AI!
                  </div>
                ) : (
                  memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container-highest group hover:border-outline transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-headline-md text-xs font-semibold text-on-surface">
                            {mem.key}
                          </span>
                          <span className="font-label-telemetry text-[10px] px-1.5 py-0.2 rounded bg-surface-container text-secondary uppercase">
                            {mem.category}
                          </span>
                        </div>
                        <span className="font-body-sm text-xs text-on-surface-variant break-words">
                          {mem.value}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all border-none bg-transparent cursor-pointer flex-shrink-0"
                        title="Forget this memory"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-container-highest bg-surface-container-low flex items-center justify-between text-xs text-secondary font-label-telemetry">
          <span className="flex items-center gap-1.5">
            <Shield size={12} className="text-primary" />
            100% Offline & Private to Pendrive
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm transition-colors border-none cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
