export default function ElectionsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Departmental Elections</h1>
      <p className="text-sm text-gray-500 mb-8">Vote for your student union representatives</p>

      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">🗳️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Elections</h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
          There are no departmental elections running at the moment. When the department
          opens an election, it will appear here and you will receive a notification.
        </p>
      </div>
    </div>
  );
}
