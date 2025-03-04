import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();
  
  let errorMessage = 'An unexpected error has occurred.';
  
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      errorMessage = 'Sorry, the page you are looking for does not exist.';
    } else {
      errorMessage = error.statusText;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-4xl font-bold text-emerald-800 dark:text-emerald-200 mb-4">
          Oops!
        </h1>
        <p className="text-emerald-700 dark:text-emerald-300 mb-8">
          {errorMessage}
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
