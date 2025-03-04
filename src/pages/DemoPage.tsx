import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function DemoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const startDemo = async () => {
    setLoading(true);
    try {
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Demo start failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-24">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center px-4 py-2 mb-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
          <Sparkles className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Free Demo Access</span>
        </div>
        
        <h1 className="text-4xl font-bold mb-6 text-emerald-900 dark:text-emerald-100">
          Try Zarium AI For Free
        </h1>
        
        <p className="text-lg text-emerald-700 dark:text-emerald-300 mb-8">
          Get instant access to our demo environment with 10 free generations. No credit card required.
        </p>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg mb-8 text-left">
          <h2 className="text-xl font-semibold mb-4 text-emerald-900 dark:text-emerald-100">
            Demo Package Includes:
          </h2>
          <ul className="space-y-3 text-emerald-700 dark:text-emerald-300">
            <li className="flex items-center">
              <ArrowRight className="h-5 w-5 mr-3 text-emerald-500" />
              10 Free Excel Generation Credits
            </li>
            <li className="flex items-center">
              <ArrowRight className="h-5 w-5 mr-3 text-emerald-500" />
              Full Access to All Features
            </li>
            <li className="flex items-center">
              <ArrowRight className="h-5 w-5 mr-3 text-emerald-500" />
              24-Hour Demo Account Access
            </li>
            <li className="flex items-center">
              <ArrowRight className="h-5 w-5 mr-3 text-emerald-500" />
              No Credit Card Required
            </li>
          </ul>
        </div>

        <button
          onClick={startDemo}
          disabled={loading}
          className="px-8 py-3 rounded-lg text-base font-medium bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Setting up demo...' : 'Start Free Demo'}
        </button>
      </div>
    </div>
  );
}
