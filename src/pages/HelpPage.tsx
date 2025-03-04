import React from 'react';
import { HelpCircle, Mail, ChevronDown } from 'lucide-react';

// FAQ data
const FAQ_ITEMS = [
  {
    question: "How many tokens do I get per plan?",
    answer: "Demo: 50,000 tokens, Basic: 1,000,000 tokens, Plus: 3,000,000 tokens, Pro: 5,000,000 tokens per month. Tokens reset monthly."
  },
  {
    question: "What happens when I run out of tokens?",
    answer: "You can either wait for your monthly token reset or purchase additional tokens through the token reload option."
  },
  {
    question: "What's the difference between Basic and Enhanced mode?",
    answer: "Enhanced mode generates more detailed and complex spreadsheets with advanced formulas and formatting. It's available in Plus and Pro plans."
  },
  {
    question: "Can I upload my own files?",
    answer: "File upload is available for Plus and Pro plan subscribers. You can upload Excel files, CSVs, and images as reference materials."
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel your subscription anytime from the 'My Subscription' page. You'll continue to have access until the end of your billing period."
  },
  {
    question: "What file formats can I download?",
    answer: "Currently, we support downloading files in .xlsx format, which is compatible with all modern spreadsheet applications."
  },
  {
    question: "Can I use my own data as reference?",
    answer: "Yes, Plus and Pro users can upload existing Excel files or CSVs as reference material for generating new spreadsheets."
  },
  {
    question: "What happens to my unused tokens?",
    answer: "Monthly tokens reset at the start of each billing cycle. Purchased tokens never expire and carry over."
  }
];

export function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-emerald-900 dark:text-emerald-100">
            How Can We Help?
          </h1>
          
          <div className="grid gap-6">
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <HelpCircle className="h-6 w-6 text-emerald-800 dark:text-emerald-200" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-6">
                    Frequently Asked Questions
                  </h3>
                  
                  <div className="space-y-4">
                    {FAQ_ITEMS.map((item, index) => (
                      <div 
                        key={index}
                        className="border-b border-emerald-100 dark:border-emerald-800 last:border-0 pb-4 last:pb-0"
                      >
                        <h4 className="text-emerald-800 dark:text-emerald-200 font-medium mb-2">
                          {item.question}
                        </h4>
                        <p className="text-emerald-600 dark:text-emerald-400">
                          {item.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <Mail className="h-6 w-6 text-emerald-800 dark:text-emerald-200" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                    Contact Support
                  </h3>
                  <p className="text-emerald-700 dark:text-emerald-300 mb-4">
                    Need more help? Our support team is here for you.
                  </p>
                  <a href="mailto:support@zarium.dev" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-medium">
                    Email support →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}