import { useEffect, useState } from 'react';
import { adminSettingsApi, extractApiError } from '../../api/client';
import type { DepartmentSettings } from '../../types';

type Tab = 'department' | 'preferences';

const PREF_KEY = 'nacos_admin_prefs';

interface Prefs {
  emailOnRegistration: boolean;
  emailOnPayment: boolean;
  emailOnNomination: boolean;
  emailOnGrade: boolean;
}

const DEFAULT_PREFS: Prefs = {
  emailOnRegistration: true,
  emailOnPayment: false,
  emailOnNomination: true,
  emailOnGrade: false,
};

function loadPrefs(): Prefs {
  try {
    const stored = localStorage.getItem(PREF_KEY);
    return stored ? { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-brand-700' : 'bg-gray-200'
      }`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
        checked ? 'left-5' : 'left-0.5'
      }`} />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('department');
  const [settings, setSettings] = useState<DepartmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  useEffect(() => {
    adminSettingsApi.getDepartment()
      .then((r) => {
        setSettings(r.data.data);
        setSession(r.data.data.currentSession ?? '');
        setSemester(r.data.data.currentSemester ?? '');
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await adminSettingsApi.updateDepartment({
        ...(session ? { currentSession: session } : {}),
        ...(semester ? { currentSemester: semester } : {}),
      });
      setSettings(updated.data.data);
      setSaveMsg('Settings saved.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof Prefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['department', 'preferences'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-b-2 border-brand-700 text-brand-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'department' ? 'Department' : 'Preferences'}
          </button>
        ))}
      </div>

      {/* Department tab */}
      {tab === 'department' && (
        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
            </div>
          ) : settings ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Department Info</p>
                <div className="space-y-3">
                  <InfoRow label="Department Name" value={settings.name} />
                  <InfoRow label="Code" value={settings.code} mono />
                  <InfoRow label="Faculty" value={settings.faculty ?? '—'} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Academic Session</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Current Session</label>
                    <input
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      placeholder="e.g. 2024/2025"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Format: YYYY/YYYY</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Not set</option>
                      <option value="first">First Semester</option>
                      <option value="second">Second Semester</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveMsg && (
                  <p className={`text-xs font-semibold ${saveMsg === 'Settings saved.' ? 'text-brand-700' : 'text-red-600'}`}>
                    {saveMsg}
                  </p>
                )}
                <div className="ml-auto">
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Preferences tab */}
      {tab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notification Emails</p>
            <p className="text-xs text-gray-400 mt-0.5">Receive email alerts for these events (email delivery is Phase 3 — stored for future use).</p>
          </div>
          <div className="divide-y divide-gray-50">
            {(
              [
                { key: 'emailOnRegistration', label: 'New student registration', desc: 'When a new student account is created' },
                { key: 'emailOnPayment', label: 'Payment received', desc: 'When a student completes a payment' },
                { key: 'emailOnNomination', label: 'New election nomination', desc: 'When a student submits a candidacy' },
                { key: 'emailOnGrade', label: 'Grade published', desc: 'When a gradebook is published' },
              ] as { key: keyof Prefs; label: string; desc: string }[]
            ).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <Toggle checked={prefs[key]} onChange={() => togglePref(key)} />
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">Preferences are saved to this browser only.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
