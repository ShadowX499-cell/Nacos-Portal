import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { electionsAdminApi, extractApiError } from '../../api/client';
import { X, Plus } from 'lucide-react';

const LEVEL_OPTIONS = ['L100', 'L200', 'L300', 'L400'];

export default function CreateElectionPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [positions, setPositions] = useState<string[]>(['President', 'Vice President', 'Secretary']);
  const [positionInput, setPositionInput] = useState('');
  const [eligibleLevels, setEligibleLevels] = useState<string[]>(['L100', 'L200', 'L300', 'L400']);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addPosition = () => {
    const p = positionInput.trim();
    if (p && !positions.includes(p)) {
      setPositions([...positions, p]);
      setPositionInput('');
    }
  };

  const removePosition = (p: string) => setPositions(positions.filter((x) => x !== p));

  const toggleLevel = (l: string) =>
    setEligibleLevels((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || positions.length === 0 || eligibleLevels.length === 0 || !startTime || !endTime) {
      setError('All fields are required and at least one position and level must be selected.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await electionsAdminApi.create({
        title: title.trim(),
        description: description.trim(),
        positions,
        eligibleLevels,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      navigate(`/admin/elections/${res.data.data.id}`);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Election</h1>
        <p className="text-sm text-gray-500 mt-0.5">Set up a departmental election for students to vote in</p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {/* Title */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Election Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NACOS Executive Elections 2025"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <label className="block text-sm font-semibold text-gray-800 mb-1 mt-4">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3} placeholder="Briefly describe this election..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>

        {/* Positions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Positions *</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {positions.map((p) => (
              <span key={p} className="flex items-center gap-1.5 bg-brand-50 text-brand-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-200">
                {p}
                <button type="button" onClick={() => removePosition(p)} className="hover:text-red-600 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={positionInput} onChange={(e) => setPositionInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPosition(); } }}
              placeholder="Type position and press Enter"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <button type="button" onClick={addPosition}
              className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 px-3 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Eligible Levels */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Eligible Levels *</label>
          <div className="flex gap-3 flex-wrap">
            {LEVEL_OPTIONS.map((l) => (
              <label key={l} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-semibold ${
                eligibleLevels.includes(l)
                  ? 'bg-brand-50 border-brand-400 text-brand-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
                <input type="checkbox" className="hidden" checked={eligibleLevels.includes(l)}
                  onChange={() => toggleLevel(l)} />
                {l.replace('L', '')} Level
              </label>
            ))}
          </div>
        </div>

        {/* Date/Time */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Start Date & Time *</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">End Date & Time *</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/admin/elections')}
            className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60">
            {submitting ? 'Creating…' : 'Create Election'}
          </button>
        </div>
      </form>
    </div>
  );
}
