import { useEffect, useState, useCallback } from 'react';
import { adminNotificationsApi, extractApiError } from '../../api/client';
import type { AdminNotification, CreateAdminNotificationForm } from '../../types';
import { Bell, Plus, Send, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TYPE_EMOJIS: Record<string, string> = {
  general: '📣', result: '📋', election: '🗳️', payment: '💳', system: '⚙️',
};

const TARGET_LABELS: Record<string, string> = {
  all: 'All students', level: 'Level target',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const EMPTY_FORM: CreateAdminNotificationForm = {
  title: '', body: '', type: 'general', target: 'all', send: false,
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'sent' | 'draft'>('sent');
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState<CreateAdminNotificationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    adminNotificationsApi.list()
      .then((r) => setNotifications(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (send: boolean) => {
    if (!form.title.trim() || !form.body.trim()) {
      setFormError('Title and message are required.');
      return;
    }
    if (form.target === 'level' && !form.targetLevel) {
      setFormError('Select a level when targeting by level.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await adminNotificationsApi.create({ ...form, send });
      setForm(EMPTY_FORM);
      setComposing(false);
      setTab(send ? 'sent' : 'draft');
      load();
    } catch (err) {
      setFormError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendDraft = async (id: string) => {
    try {
      await adminNotificationsApi.send(id);
      setTab('sent');
      load();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft?')) return;
    try {
      await adminNotificationsApi.delete(id);
      load();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const sent = notifications.filter((n) => n.isSent);
  const drafts = notifications.filter((n) => !n.isSent);
  const visible = tab === 'sent' ? sent : drafts;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Send announcements to students</p>
        </div>
        <button
          onClick={() => { setComposing((c) => !c); setFormError(''); }}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          {composing ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {composing ? 'Cancel' : 'New Notification'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>
      )}

      {/* Compose panel */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-brand-50 border border-brand-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
                <Bell className="w-4 h-4 text-brand-300" />
                <p className="text-white font-bold text-sm">Compose Notification</p>
              </div>

              <div className="p-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs">{formError}</div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-brand-900 mb-1">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. NACOS Week — Important Announcement"
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-900 mb-1">Message *</label>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    rows={4}
                    placeholder="Write your announcement here…"
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-900 mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CreateAdminNotificationForm['type'] }))}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="general">📣 General</option>
                      <option value="result">📋 Result</option>
                      <option value="election">🗳️ Election</option>
                      <option value="payment">💳 Payment</option>
                      <option value="system">⚙️ System</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-900 mb-1">Target Audience</label>
                    <select
                      value={form.target}
                      onChange={(e) => setForm((f) => ({ ...f, target: e.target.value as 'all' | 'level', targetLevel: undefined }))}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="all">All Students</option>
                      <option value="level">By Level</option>
                    </select>
                  </div>
                </div>

                {form.target === 'level' && (
                  <div>
                    <label className="block text-xs font-semibold text-brand-900 mb-1">Select Level *</label>
                    <select
                      value={form.targetLevel ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, targetLevel: e.target.value }))}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Choose level…</option>
                      <option value="L100">100 Level</option>
                      <option value="L200">200 Level</option>
                      <option value="L300">300 Level</option>
                      <option value="L400">400 Level</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    onClick={() => void handleSubmit(false)}
                    disabled={submitting}
                    className="border border-brand-300 text-brand-800 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-brand-100 transition-colors disabled:opacity-60"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => void handleSubmit(true)}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Sending…' : 'Send Now'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {(['sent', 'draft'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-b-2 border-brand-700 text-brand-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'sent' ? 'Sent' : 'Drafts'}
            <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              t === 'sent' ? 'bg-brand-100 text-brand-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {t === 'sent' ? sent.length : drafts.length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">
              {tab === 'sent' ? 'No sent notifications yet' : 'No drafts saved'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {tab === 'sent' ? 'Compose and send your first announcement.' : 'Save a draft to see it here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visible.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-4">
                <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_EMOJIS[n.type] ?? '📣'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {timeAgo(n.createdAt)} · {n.targetLevel ? `Level ${n.targetLevel.replace('L', '')}` : TARGET_LABELS[n.target]} · {n.recipientCount} recipients
                  </p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{n.body}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {n.isSent ? (
                    <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">Sent</span>
                  ) : (
                    <>
                      <button
                        onClick={() => void handleSendDraft(n.id)}
                        className="flex items-center gap-1 text-xs font-bold text-brand-700 border border-brand-200 hover:bg-brand-50 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Send className="w-3 h-3" /> Send
                      </button>
                      <button
                        onClick={() => void handleDelete(n.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
