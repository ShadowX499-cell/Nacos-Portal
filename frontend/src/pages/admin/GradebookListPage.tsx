import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gradebookApi, extractApiError } from '../../api/client';
import type { Gradebook } from '../../types';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  locked: 'bg-gray-100 text-gray-600',
};

export default function GradebookListPage() {
  const navigate = useNavigate();
  const [gradebooks, setGradebooks] = useState<Gradebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    gradebookApi.list()
      .then((res) => setGradebooks(res.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gradebooks</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage semester result books</p>
          </div>
          <button onClick={() => navigate('/admin/gradebooks/new')} className="btn-primary">
            + New Gradebook
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-6">{error}</div>
        )}

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Loading…</div>
        ) : gradebooks.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500 mb-4">No gradebooks yet.</p>
            <button onClick={() => navigate('/admin/gradebooks/new')} className="btn-primary">
              Create your first gradebook
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Level</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Session</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Semester</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradebooks.map((gb) => (
                  <tr key={gb.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{gb.name}</td>
                    <td className="px-4 py-3 text-gray-600">{gb.level}</td>
                    <td className="px-4 py-3 text-gray-600">{gb.session}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{gb.semester}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[gb.status] ?? ''}`}>
                        {gb.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/gradebooks/${gb.id}`} className="text-brand-800 hover:underline text-xs font-medium">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
