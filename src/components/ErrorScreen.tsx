interface ErrorScreenProps {
  error: string;
}

export default function ErrorScreen({ error }: ErrorScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-red-500 text-center">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
