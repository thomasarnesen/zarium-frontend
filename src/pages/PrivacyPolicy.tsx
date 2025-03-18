import React from 'react';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-emerald-900 dark:text-emerald-100">
            Privacy Policy
          </h1>

          <div className="prose prose-emerald dark:prose-invert max-w-none">
            <p className="text-lg text-emerald-800 dark:text-emerald-200 mb-8">
              <strong>Last Updated:</strong> March 18, 2025
            </p>

            <h2 className="text-3xl font-semibold mb-6 text-emerald-800 dark:text-emerald-200">
              1. Introduction
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              This Privacy Policy describes how Zarium Excel Generator ("we," "our," or "us") collects, uses, stores, and protects your personal information when you use our Excel generation service, website, and related services (collectively referred to as the "Service").
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              We respect your privacy and are committed to protecting your personal information. We encourage you to read this Privacy Policy carefully to understand how we handle your data and what rights you have regarding this information.
            </p>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              2. Information We Collect
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              <strong>2.1 Account Information</strong>
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              When you create an account with Zarium Excel Generator, we collect:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-4">
              <li>Email address</li>
              <li>Password (stored in encrypted form)</li>
              <li>Plan type (Demo, Basic, Plus, Pro)</li>
              <li>Information about when the account was created</li>
            </ul>

            <p className="text-gray-800 dark:text-gray-200">
              <strong>2.2 Usage Data</strong>
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              We collect data about how you use the service, including:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-4">
              <li>Submitted requests for Excel generation</li>
              <li>Tokens used per generation</li>
              <li>Timestamps of generations</li>
            </ul>

            <p className="text-gray-800 dark:text-gray-200">
              <strong>2.3 Temporary Storage</strong>
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              We temporarily store the following for a maximum of 12 hours:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-4">
              <li>Generated Excel files (to enable user downloads)</li>
              <li>Requests and prompts submitted for generation</li>
              <li>Any uploaded content needed for processing your requests</li>
            </ul>
            <p className="text-gray-800 dark:text-gray-200">
              This temporary data is only accessible to Zarium systems and authorized personnel for the sole purpose of providing our service. It is automatically deleted after 12 hours and is not used for any other purposes.
            </p>

            <p className="text-gray-800 dark:text-gray-200">
              <strong>2.4 Payment Information</strong>
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              For paid subscriptions and token purchases, our payment processor Stripe processes the following information:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-4">
              <li>Payment card details</li>
              <li>Billing address</li>
              <li>Purchase history</li>
              <li>Stripe customer identifier</li>
            </ul>
            <p className="text-gray-800 dark:text-gray-200">
              We do not store your complete payment card details, as these are handled directly by Stripe.
            </p>

            <p className="text-gray-800 dark:text-gray-200">
              <strong>2.5 Technical Data</strong>
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              When you use our service, we may collect technical information including:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-4">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Referral source</li>
              <li>Time of visit</li>
              <li>Device identifiers</li>
            </ul>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              3. How We Use the Information
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              We use the collected information for the following purposes:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-6">
              <li>Providing, maintaining, and improving our Excel generation service</li>
              <li>Processing payments and managing subscriptions</li>
              <li>Tracking token usage and managing account privileges</li>
              <li>Generating Excel files based on your specifications</li>
              <li>Communicating with you about your account, new features, and system updates</li>
              <li>Preventing fraud and unauthorized use of the service</li>
              <li>Analyzing usage patterns to improve the service</li>
              <li>Complying with legal obligations</li>
            </ul>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              4. Storage and Security
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              <strong>4.1 Storage Period</strong>
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              We store your personal information only as long as necessary to fulfill the purposes described in this Privacy Policy. Generated Excel files, uploaded content, and requests are automatically deleted after 12 hours. Account information is retained as long as you have an active account, and for up to 12 months after account termination to comply with legal obligations and resolve any disputes.
            </p>

            <p className="text-gray-800 dark:text-gray-200">
              <strong>4.2 Security Measures</strong>
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              We use industry standards to protect your personal information, including:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-4">
              <li>Password encryption</li>
              <li>JSON Web Tokens (JWT) for secure authentication</li>
              <li>CSRF protection for the web application</li>
              <li>Separation of user data in isolated environments</li>
              <li>Regular security reviews of the system</li>
              <li>Access control for database access</li>
            </ul>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              5. Sharing of Information
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              We share your personal information only in the following cases:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-6">
              <li><strong>Payment Processors:</strong> We share necessary information with Stripe to process payments and manage subscriptions.</li>
              <li><strong>AI Services:</strong> We use third-party AI services to generate Excel code, but only share anonymized requests without identifying user information. These AI services do not store your data or use it for any purpose other than fulfilling your specific request.</li>
              <li><strong>Hosting Providers:</strong> Azure and other providers that host our servers and services have access to system logs, but we limit access to personal information.</li>
              <li><strong>Legal Requirements:</strong> We may share data if required by law or in connection with legal proceedings.</li>
            </ul>
            <p className="text-gray-800 dark:text-gray-200">
              We never sell or rent your personal information to third parties for marketing purposes.
            </p>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              6. Your Rights
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              According to GDPR and other privacy laws, you have the following rights:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-6">
              <li><strong>Right of Access:</strong> You can request a copy of the personal information we have about you.</li>
              <li><strong>Right to Rectification:</strong> You can ask us to correct inaccurate or incomplete personal information.</li>
              <li><strong>Right to Erasure:</strong> You can ask us to delete your personal information under certain circumstances.</li>
              <li><strong>Right to Restriction of Processing:</strong> You can ask us to restrict the processing of your personal information.</li>
              <li><strong>Right to Data Portability:</strong> You can request to receive your data in a structured, commonly used, and machine-readable format for transfer to another service provider.</li>
              <li><strong>Right to Object:</strong> You can object to the processing of your personal information under certain circumstances.</li>
            </ul>
            <p className="text-gray-800 dark:text-gray-200">
              To exercise any of these rights, please contact us at <strong>support@zarium.com</strong>.
            </p>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              7. Cookies
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              We use cookies to improve usability and collect analytical information. This includes:
            </p>
            <ul className="text-gray-800 dark:text-gray-200 list-disc pl-8 mb-4">
              <li><strong>Necessary Cookies:</strong> To enable basic functions such as authentication and security (including CSRF protection).</li>
              <li><strong>Preference Cookies:</strong> To remember your settings such as theme and language.</li>
              <li><strong>Analytical Cookies:</strong> To understand how users navigate our website.</li>
            </ul>
            <p className="text-gray-800 dark:text-gray-200">
              You can control the use of non-essential cookies through your browser settings.
            </p>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              8. Children
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              Our services are not directed at persons under the age of 16, and we do not knowingly collect personal information from children under 16. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us and we will delete the information.
            </p>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              9. Changes to the Privacy Policy
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              We may update this Privacy Policy from time to time. We will inform you of significant changes by posting the new Privacy Policy on this page and notifying you via email or through a message on our service.
            </p>

            <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
              10. Contact Information
            </h2>
            <p className="text-gray-800 dark:text-gray-200">
              If you have questions, concerns, or wish to exercise your rights regarding this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-800 dark:text-gray-200 mb-8">
              <strong>Email:</strong> support@zarium.com
            </p>

            <p className="text-gray-800 dark:text-gray-200 mt-10">
              Thank you for choosing Zarium Excel Generator as your preferred Excel file generation service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}