import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              ResearchBase
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
            Your AI-Powered
            <br />
            <span className="text-blue-600">Research Environment</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Write with AI assistance, understand your documents semantically,
            retrieve evidence from sources, and verify citations automatically.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Start for free
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Learn more
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mt-32">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
            Everything you need for research
          </h2>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'AI Writing Assistant',
                description: 'Summarize, rewrite, expand, and transform your text with slash commands.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                ),
              },
              {
                title: 'Ask Your Project',
                description: 'Query your entire knowledge base and get answers with citations.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ),
              },
              {
                title: 'PDF Sources',
                description: 'Upload PDFs and find relevant evidence automatically.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                ),
              },
              {
                title: 'Citation Verification',
                description: 'AI-powered verification of your citations against sources.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ),
              },
              {
                title: 'Argument Mapping',
                description: 'Visualize claims, assumptions, and their relationships.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                ),
              },
              {
                title: 'Safety Scoring',
                description: 'Detect unsupported claims and potential hallucinations.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                ),
              },
            ].map((feature, index) => (
              <div key={index} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Ready to transform your research?
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
            Start using ResearchBase today.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Get started for free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500 dark:text-gray-400">
            &copy; 2025 ResearchBase. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
