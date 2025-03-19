import React from 'react';

export function TermsContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-emerald-900 dark:text-emerald-100">
            Terms of Service
          </h1>

          <div className="prose prose-emerald dark:prose-invert max-w-none">
            <p className="text-lg text-emerald-800 dark:text-emerald-200 mb-8">
              <strong>Last Updated:</strong> February 12, 2025
            </p>

            {/* Table of Contents */}
            <div className="mb-10 p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-emerald-800 dark:text-emerald-200">Table of Contents</h2>
              <ul className="space-y-1 text-emerald-700 dark:text-emerald-300">
                <li><a href="#introduction" className="hover:text-emerald-500 dark:hover:text-emerald-400">1. Introduction and Acceptance of Terms</a></li>
                <li><a href="#service-description" className="hover:text-emerald-500 dark:hover:text-emerald-400">2. Service Description and Capabilities</a></li>
                <li><a href="#account-registration" className="hover:text-emerald-500 dark:hover:text-emerald-400">3. Account Registration and Security</a></li>
                <li><a href="#subscription-plans" className="hover:text-emerald-500 dark:hover:text-emerald-400">4. Subscription Plans and Payment Terms</a></li>
                <li><a href="#token-usage" className="hover:text-emerald-500 dark:hover:text-emerald-400">5. Token Usage and Service Limitations</a></li>
                <li><a href="#service-availability" className="hover:text-emerald-500 dark:hover:text-emerald-400">6. Service Availability and Performance</a></li>
                <li><a href="#intellectual-property" className="hover:text-emerald-500 dark:hover:text-emerald-400">7. Intellectual Property Rights</a></li>
                <li><a href="#acceptable-use" className="hover:text-emerald-500 dark:hover:text-emerald-400">8. Acceptable Use and Conduct</a></li>
                <li><a href="#service-modifications" className="hover:text-emerald-500 dark:hover:text-emerald-400">9. Service Modifications and Updates</a></li>
                <li><a href="#liability-limitations" className="hover:text-emerald-500 dark:hover:text-emerald-400">10. Liability Limitations and Warranties</a></li>
                <li><a href="#contact-support" className="hover:text-emerald-500 dark:hover:text-emerald-400">11. Contact and Support Information</a></li>
              </ul>
            </div>

            <section id="introduction">
              <h2 className="text-3xl font-semibold mb-6 text-emerald-800 dark:text-emerald-200">
                1. Introduction and Acceptance of Terms
              </h2>
              <p className="mb-4">
                Welcome to Zarium Excel Generator, your premier solution for automated Excel file generation. These Terms of Service ("Terms") constitute a legally binding agreement between you and Zarium Excel Generator ("Zarium," "we," "our," or "us") governing your access to and use of our Excel generation service, website, and related features (collectively, the "Service").
              </p>
              <p className="mb-4">
                By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms in their entirety. Our commitment to providing exceptional Excel generation capabilities is matched by our expectation that users will engage with our Service responsibly and in accordance with these Terms.
              </p>
              <p className="mb-4">
                If you do not agree with any part of these Terms, you should not access or use our Service. We recommend reviewing these Terms periodically, as they may be updated to reflect improvements in our Service and evolving business practices.
              </p>
            </section>

            <section id="service-description">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                2. Service Description and Capabilities
              </h2>
              <p className="mb-4">
                Zarium Excel Generator provides sophisticated Excel file generation services powered by advanced technology. Our Service enables users to create professional-grade Excel spreadsheets through an intuitive interface that transforms your requirements into meticulously formatted files.
              </p>
              <p className="mb-4">
                The Service includes various features designed to enhance your productivity, including custom formatting options, advanced formula generation, and professional template creation.
              </p>
              <p className="mb-4">
                Our platform operates on a token-based system that provides flexible access to our generation capabilities. Each successful file generation requires a specific number of tokens, which are allocated based on your subscription plan and any additional token purchases you make. This system ensures fair resource allocation while providing you with the freedom to generate Excel files according to your specific needs.
              </p>
            </section>

            <section id="account-registration">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                3. Account Registration and Security
              </h2>
              <p className="mb-4">
                When you register for a Zarium Excel Generator account, you gain access to our full range of Excel generation capabilities. Your account serves as your personal gateway to our Service, allowing you to manage your generations, track token usage, and maintain your preferences.
              </p>
              <p className="mb-4">
                The registration process requires you to provide accurate and complete information, including a valid email address that will serve as your primary means of account identification and communication with our Service.
              </p>
              <h3 className="text-2xl font-semibold mt-6 mb-4 text-emerald-700 dark:text-emerald-300">
                Account Security and User Responsibilities
              </h3>
              <p className="mb-4">
                The security of your Zarium Excel Generator account begins with your commitment to maintaining strong access credentials. Upon creating your account, you will establish a password that meets our robust security requirements.
              </p>
              <p className="mb-4">
                You acknowledge and agree that you are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. We strongly advise against sharing your account credentials with any third parties.
              </p>
              <p className="mb-4">
                Should you detect or suspect any unauthorized access to your account, you must notify us immediately through our designated support channels.
              </p>
            </section>

            <section id="subscription-plans">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                4. Subscription Plans and Payment Terms
              </h2>
              <p className="mb-4">
                Zarium Excel Generator offers various subscription plans designed to accommodate different user needs and Excel generation requirements. Each plan provides a specific allocation of tokens that refresh on a monthly basis, along with access to different feature sets and capabilities.
              </p>
              <p className="mb-4">
                Our Basic, Plus, and Pro plans each offer increasing levels of functionality and token allowances, allowing you to choose the option that best suits your requirements.
              </p>
              <p className="mb-4">
                When you subscribe to our Service, you agree to pay all applicable fees associated with your chosen subscription plan. All payments are processed securely through our trusted payment provider, with recurring charges being automatically applied to your designated payment method at the start of each billing cycle.
              </p>
              <p className="mb-4">
                Subscription fees are non-refundable except where required by applicable law, and partial months of service are not eligible for refunds upon cancellation.
              </p>
            </section>

            <section id="token-usage">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                5. Token Usage and Service Limitations
              </h2>
              <p className="mb-4">
                Every Excel file generation through our Service requires a specified number of tokens, which are deducted from your account balance upon successful completion. Token consumption varies based on the complexity and specifications of your requested generations, with more sophisticated files requiring additional tokens.
              </p>
              <p className="mb-4">
                Your monthly token allocation is automatically credited to your account at the beginning of each billing cycle, and unused tokens do not carry over to subsequent months unless explicitly stated in your subscription plan details.
              </p>
              <p className="mb-4">
                Our service maintains certain limitations to ensure optimal performance and fair resource allocation among all users. These limitations may include restrictions on file sizes, generation frequency, and the complexity of Excel files that can be generated within a specific timeframe.
              </p>
              <p className="mb-4">
                While we strive to accommodate all legitimate usage patterns, we reserve the right to implement additional limitations if necessary to maintain service quality and prevent system abuse.
              </p>
            </section>

            <section id="service-availability">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                6. Service Availability and Performance
              </h2>
              <p className="mb-4">
                While we are committed to maintaining consistent service availability, you acknowledge that our Service may occasionally experience temporary interruptions due to maintenance, updates, or technical issues beyond our control.
              </p>
              <p className="mb-4">
                These interruptions are typically brief and scheduled during periods of lowest usage to minimize impact on our users. We work diligently to resolve any unplanned disruptions promptly and keep you informed of any maintenance that might affect your ability to generate Excel files.
              </p>
              <p className="mb-4">
                Our commitment to delivering exceptional performance means that we continuously monitor and optimize our generation systems. Each Excel file is created with precision and attention to detail, ensuring that your specifications are accurately reflected in the final output.
              </p>
              <p className="mb-4">
                While we strive to process all generation requests as quickly as possible, processing times may vary based on file complexity and current system load.
              </p>
            </section>

            <section id="intellectual-property">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                7. Intellectual Property Rights
              </h2>
              <p className="mb-4">
                When you generate Excel files through our Service, you retain full ownership rights to the content and data within those files. The unique specifications, formulas, and data structures you create using our Service belong entirely to you.
              </p>
              <p className="mb-4">
                However, the underlying technology, algorithms, and systems that power our Excel generation capabilities remain the exclusive property of Zarium Excel Generator. This includes our proprietary generation engine, user interface elements, and all associated software components.
              </p>
              <p className="mb-4">
                Our Service incorporates various proprietary technologies and methodologies that are protected by intellectual property laws. By using our Service, you acknowledge that you are granted a limited, non-exclusive license to utilize these technologies solely for the purpose of generating Excel files through our platform.
              </p>
              <p className="mb-4">
                This license is personal to you and cannot be transferred, assigned, or sublicensed to any other party without our explicit written consent.
              </p>
            </section>

            <section id="acceptable-use">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                8. Acceptable Use and Conduct
              </h2>
              <p className="mb-4">
                Your use of Zarium Excel Generator must comply with all applicable laws, regulations, and professional standards. We trust our users to generate Excel files that serve legitimate business or personal purposes.
              </p>
              <p className="mb-4">
                Our Service is designed to support productive and ethical use cases, and we expect all users to respect these principles. You agree to use our Service in a manner that does not infringe upon the rights of others or compromise the integrity of our platform.
              </p>
              <p className="mb-4">
                We maintain a strong commitment to preventing any misuse of our Service. This includes but is not limited to generating Excel files containing malicious content, attempting to circumvent our token system, or using our Service in ways that could harm other users or our infrastructure.
              </p>
              <p className="mb-4">
                While we respect your privacy and do not actively monitor the content of generated files, we reserve the right to investigate and address any reported violations of these Terms.
              </p>
            </section>

            <section id="service-modifications">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                9. Service Modifications and Updates
              </h2>
              <p className="mb-4">
                As part of our ongoing commitment to excellence, we continuously enhance and refine our Excel generation capabilities. These improvements may include the introduction of new features, optimization of existing functionality, or modifications to our user interface.
              </p>
              <p className="mb-4">
                We carefully implement these changes to ensure they enhance your experience without disrupting your established workflows. While we strive to provide advance notice of significant changes, we reserve the right to modify, suspend, or discontinue any aspect of our Service at our discretion.
              </p>
              <p className="mb-4">
                Our evolution as a service is guided by our understanding of user needs and technological advancements in the field of automated Excel generation. When we introduce new features or capabilities, they become immediately available to users based on their subscription plan level.
              </p>
              <p className="mb-4">
                These updates may occasionally require adjustments to our token consumption rates or generation parameters, which we will communicate clearly through our established channels.
              </p>
            </section>

            <section id="liability-limitations">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                10. Liability Limitations and Warranties
              </h2>
              <p className="mb-4">
                Our dedication to providing reliable Excel generation capabilities is reflected in the robust infrastructure and advanced technologies we employ. However, while we strive for excellence in all aspects of our Service, we provide our platform "as is" and make no express warranties about the completeness, reliability, or uninterrupted availability of our Service.
              </p>
              <p className="mb-4">
                We work diligently to maintain high standards of performance and accuracy in file generation, but we cannot guarantee that our Service will always be error-free or meet every specific requirement you may have.
              </p>
              <p className="mb-4">
                In using our Service, you acknowledge that certain factors beyond our control may affect our ability to deliver Excel files, including internet connectivity issues, hardware limitations, or other technical constraints.
              </p>
              <p className="mb-4">
                We take extensive precautions to protect against service interruptions and data loss, but we cannot be held liable for any damages or losses resulting from such occurrences. This includes any direct, indirect, incidental, special, or consequential damages arising from your use of our Service or any generated Excel files.
              </p>
            </section>

            <section id="contact-support">
              <h2 className="text-3xl font-semibold mt-10 mb-6 text-emerald-800 dark:text-emerald-200">
                11. Contact and Support Information
              </h2>
              <p className="mb-4">
                Should you have any questions, concerns, or require clarification about any aspect of these Terms, our dedicated support team is available to assist you.
              </p>
              <p className="mb-6">
                For all inquiries including general support, billing questions, and technical assistance, 
                please contact us at <a href="mailto:support@zarium.dev" className="text-emerald-600 dark:text-emerald-400 hover:underline">support@zarium.dev</a>.
                Our team typically responds within one business day.
              </p>
              <p className="mb-4">
                This version of the Terms of Service became effective on February 12, 2025, and supersedes all previous versions. We thank you for being part of the Zarium Excel Generator community and for your trust in our Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}