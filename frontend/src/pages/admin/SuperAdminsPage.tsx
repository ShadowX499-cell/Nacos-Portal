import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Trash2, Plus, X } from 'lucide-react';
import { superAdminsApi, adminApi, extractApiError } from '../../api/client';
import type { User, SuperAdminType } from '../../types';

const ROLE_LABELS: Record<SuperAdminType, string> = {
  course_adviser: 'Course Adviser',
  hod: 'Head of Department',
  result_exam_officer: 'Result / Exam Officer',
};
const ROLE_COLORS: Record<SuperAdminType, string> = {
  course_adviser: 'bg-blue-100 text-blue-700',
  hod: 'bg-purple-100 text-purple-700',
  result_exam_officer: 'bg-green-100 text-green-700',
};

function AssignModal({ onClose, onAssigned }: { onClose: () => void; onAssigned: () => void }) {
  const [admins, setAdmins] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [role, setRole] = useState<SuperAdminType>('course_adviser');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.listUsers({ limit: 100 }).then((r) => {
      setAdmins(r.data.data.filter((u) => u.role !== 'student'));
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!selectedId) { setError('Select a user'); return; }
    setLoading(true); setError('');
    try {
      await superAdminsApi.assign(selectedId, role);
      onAssigned();
      onClose();
    } catch (err) { setError(extractApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Assign Super Admin Role</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="label">Select Admin</label>
            <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Choose an admin…</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.userId})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Role to Assign</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as SuperAdminType)}>
              <option value="course_adviser">Course Adviser</option>
              <option value="result_exam_officer">Result / Exam Officer</option>
              <option value="hod">Head of Department</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleSubmit} disabled={loading} className="btn-primary btn-sm flex-1">
            {loading ? 'Assigning…' : 'Assign Role'}
          </button>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SuperAdminsPage() {
  const [superAdmins, setSuperAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    superAdminsApi.list()
      .then((r) => setSuperAdmins(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm('Remove this super admin role?')) return;
    setRevoking(id);
    try { await superAdminsApi.revoke(id); load(); }
    catch (err) { setError(extractApiError(err)); }
    finally { setRevoking(null); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      {showModal && <AssignModal onClose={() => setShowModal(false)} onAssigned={load} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage elevated administrator roles</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Super Admin
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">{error}</div>}

      {/* Role capability cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(Object.entries(ROLE_LABELS) as [SuperAdminType, string][]).map(([role, label]) => (
          <div key={role} className="bg-white border border-gray-200 rounded-xl p-4">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>{label}</span>
            <ul className="mt-3 space-y-1 text-xs text-gray-600">
              {role === 'course_adviser' && <>
                <li>✅ Approve course registrations</li><li>✅ Enter grades</li><li>✅ View own audit trail</li>
              </>}
              {role === 'result_exam_officer' && <>
                <li>✅ Publish results</li><li>✅ Manage exam attendance</li><li>✅ View own audit trail</li>
              </>}
              {role === 'hod' && <>
                <li>✅ All permissions above</li><li>✅ Advance semester/session</li>
                <li>✅ View revenue</li><li>✅ Manage elections</li><li>✅ View all audit logs</li>
              </>}
            </ul>
          </div>
        ))}
      </div>

      {/* Super admins list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : superAdmins.length === 0 ? (
          <div className="p-10 text-center">
            <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No super admins assigned yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">User ID</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                <th className="px-5 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {superAdmins.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{u.userId}</td>
                  <td className="px-5 py-3">
                    {u.superAdminType && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.superAdminType]}`}>
                        {ROLE_LABELS[u.superAdminType]}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.superAdminType !== 'hod' && (
                      <button onClick={() => handleRevoke(u.id)} disabled={revoking === u.id}
                        className="text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
