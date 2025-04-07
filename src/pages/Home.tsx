import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Sparkles, Zap, Shield, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Helmet } from 'react-helmet-async';
// @ts-ignore
import { RecaptchaService } from '../utils/recaptchaService';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLoggedIn = !!user?.token;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Authentication methods removed but kept as empty functions to avoid breaking any dependencies
  const handleGetStarted = async () => {
    // Authentication functionality removed
  };
  
  const proceedWithAuth = async () => {
    // Authentication functionality removed
  };

  return (
    <>
      <Helmet>
        <title>Zarium | Automated Spreadsheet Generator | Office Open XML Format</title>
        <meta name="description" content="Transform data into professional spreadsheets using Office Open XML format. An automated solution for your data processing needs." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 sm:px-6">
          
          {/* Hero Section */}
          <div className="pt-16 md:pt-24 pb-12 md:pb-20">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center justify-center px-4 py-2 mb-6 md:mb-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 shadow-sm">
                <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="text-sm font-medium">Automated Solution</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-emerald-900 dark:text-emerald-100 leading-tight">
                Professional Spreadsheets,<br />Generated Automatically
              </h1>
              <p className="text-base md:text-lg text-emerald-700 dark:text-emerald-300 mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto">
                Transform your data into professional spreadsheets instantly using Office Open XML format.
                Our solution helps streamline your data processing needs.
              </p>
              {/* CTA buttons removed */}
              {error && (
                <div className="mt-4 text-red-600 dark:text-red-400">{error}</div>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto pb-12 md:pb-16">
            {[
              {
                icon: <Zap className="h-6 w-6" aria-hidden="true" />,
                title: "Improved Efficiency",
                description: "Create complete spreadsheets in seconds with our advanced technology - saving you hours of manual work each week."
              },
              {
                icon: <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />,
                title: "Professional Reports",
                description: "Create professional reports with advanced visualizations, custom formatting, and complex formulas compatible with popular spreadsheet software."
              },
              {
                icon: <Shield className="h-6 w-6" aria-hidden="true" />,
                title: "Data Transformation",
                description: "Upload your existing data to clean, improve, analyze, or solve specific tasks with advanced assistance."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all border border-emerald-100 dark:border-emerald-800 flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-800 dark:text-emerald-200 mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4 text-emerald-900 dark:text-emerald-100">
                  {feature.title}
                </h3>
                <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
          
          {/* How It Works Section */}
          <div className="max-w-5xl mx-auto pb-16 md:pb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-emerald-900 dark:text-emerald-100">
              How Zarium Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Secure Access",
                  description: "Access your account with secure authentication to protect your data and templates."
                },
                {
                  step: "2",
                  title: "Automated Creation",
                  description: "Our advanced system generates complete XLSX files with formulas, graphs, and professional formatting."
                },
                {
                  step: "3",
                  title: "Easy Export",
                  description: "Download and use your files with any application that supports the Office Open XML format."
                }
              ].map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-700 dark:bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold mb-6" aria-hidden="true">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-emerald-900 dark:text-emerald-100">
                    {step.title}
                  </h3>
                  <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Use Cases Section */}
          <div className="bg-emerald-50 dark:bg-gray-800/50 py-12 md:py-16 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-16 md:mb-20">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-emerald-900 dark:text-emerald-100">
                Solution Applications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[
                  "Financial Modeling & Planning",
                  "Data Visualization & Analytics",
                  "Supply Chain Management",
                  "Budget Management",
                  "Business Intelligence & Reporting",
                  "Automated Financial Documents",
                  "Resource Planning",
                  "Performance Metrics Tracking",
                  "Custom Data Solutions"
                ].map((useCase, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-3 flex-shrink-0" aria-hidden="true" />
                    <span className="text-emerald-800 dark:text-emerald-200 font-medium">{useCase}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="bg-emerald-700 dark:bg-emerald-800 text-white -mx-4 sm:-mx-6 px-4 sm:px-6 py-12 md:py-16 mb-8 md:mb-12 rounded-lg md:rounded-xl">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">
                Transform Your Workflow with Zarium
              </h2>
              <p className="text-base md:text-lg text-emerald-100 dark:text-emerald-200 mb-6 md:mb-8 max-w-2xl mx-auto">
                Join others who save hundreds of hours each month with Zarium's automated spreadsheet solution.
              </p>
              {/* CTA button removed */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;