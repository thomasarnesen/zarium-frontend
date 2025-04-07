import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Building2, Mail, Phone, Users, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    jobTitle: '',
    companySize: '',
    phoneNumber: '',
    message: '',
    acceptTerms: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast.error('Please accept the terms and conditions to proceed.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real implementation, you would send this data to your backend API
      console.log('Form data to be sent:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Your request has been submitted. Our team will contact you shortly.');
      setSubmitted(true);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('There was a problem submitting your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 md:p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-300 mx-auto mb-6">
                <Mail className="h-8 w-8" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-4">
                Request Received!
              </h1>
              <p className="text-emerald-700 dark:text-emerald-300 mb-8 max-w-lg mx-auto">
                Thank you for your interest in Zarium's enterprise solutions. One of our team members will review your request and contact you within 24-48 business hours.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Contact Zarium | Enterprise Excel AI Solutions</title>
        <meta name="description" content="Contact our team to learn how Zarium's AI Excel solution can transform your business processes and save your organization valuable time." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-900 dark:text-emerald-100 mb-4">
              Get in Touch
            </h1>
            <p className="text-emerald-700 dark:text-emerald-300 max-w-2xl mx-auto">
              Interested in how Zarium can help your organization? Fill out the form below and our enterprise team will get back to you within 24-48 hours.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="bg-emerald-700 dark:bg-emerald-800 text-white p-8 md:p-12 md:w-1/3">
                <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-emerald-200 mt-1">support@zarium.dev</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 md:p-12 md:w-2/3">
                <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-6">
                  Request Enterprise Access
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        First Name*
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full p-3 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-700 text-emerald-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        Last Name*
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full p-3 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-700 text-emerald-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                      Business Email*
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-3 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-700 text-emerald-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        Company Name*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <input
                          id="companyName"
                          name="companyName"
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={handleChange}
                          className="w-full p-3 pl-10 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-700 text-emerald-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="jobTitle" className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        Job Title*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Briefcase className="h-5 w-5 text-emerald-500" />
                        </div>
                        <input
                          id="jobTitle"
                          name="jobTitle"
                          type="text"
                          required
                          value={formData.jobTitle}
                          onChange={handleChange}
                          className="w-full p-3 pl-10 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-700 text-emerald-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="companySize" className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        Company Size*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Users className="h-5 w-5 text-emerald-500" />
                        </div>
                        <select
                          id="companySize"
                          name="companySize"
                          required
                          value={formData.companySize}
                          onChange={handleChange}
                          className="w-full p-3 pl-10 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-700 text-emerald-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
                        >
                          <option value="">Select company size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="501-1000">501-1,000 employees</option>
                          <option value="1001+">1,001+ employees</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-emerald-500" />
                        </div>
                        <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          className="w-full p-3 pl-10 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-700 text-emerald-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                      How can we help your organization?
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full p-3 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-700 text-emerald-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="acceptTerms"
                        name="acceptTerms"
                        type="checkbox"
                        checked={formData.acceptTerms}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                      />
                    </div>
                    <label htmlFor="acceptTerms" className="ml-3 text-sm text-emerald-700 dark:text-emerald-300">
                      I agree to Zarium's <a href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms of Service</a> and <a href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</a>.
                    </label>
                  </div>
                  
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Request Enterprise Access'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;