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
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">ResearchBase</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">
                How it works
              </a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">
                Pricing
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/20 dark:to-gray-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Now in public beta
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                Your AI-powered
                <br />
                <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                  research brain
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Write with AI assistance. Understand your documents semantically.
                Find evidence instantly. Verify citations automatically.
                Build your knowledge base effortlessly.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-xl shadow-indigo-500/25 transition-all hover:scale-105"
                >
                  Start for free
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-lg transition-all"
                >
                  See how it works
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex flex-wrap justify-center gap-8 text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Free during beta</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Hero image/preview */}
            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 to-transparent z-10 h-32 bottom-0 top-auto" />
              <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-center text-sm text-gray-400">ResearchBase</div>
                </div>
                <div className="p-6 bg-gray-900 min-h-[400px] flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-400">Interactive Demo Coming Soon</p>
                    <p className="text-sm text-gray-600 mt-1">Sign up to be notified when it&apos;s ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Everything you need for modern research
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                From writing to verification, ResearchBase has you covered with AI-powered tools designed for researchers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: 'AI Writing Assistant',
                  description: 'Transform your text with slash commands. Summarize, rewrite, expand, and refine with Claude AI.',
                  icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
                  color: 'from-blue-500 to-cyan-500',
                },
                {
                  title: 'Ask Your Project',
                  description: 'Query your entire knowledge base in natural language. Get answers synthesized from all your sources.',
                  icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                  color: 'from-purple-500 to-pink-500',
                },
                {
                  title: 'PDF Source Library',
                  description: 'Upload PDFs, automatically extract and embed text. Search semantically across all your documents.',
                  icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                  color: 'from-orange-500 to-red-500',
                },
                {
                  title: 'Evidence Finder',
                  description: 'Find supporting evidence for any claim. Semantic search surfaces the most relevant passages instantly.',
                  icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
                  color: 'from-green-500 to-emerald-500',
                },
                {
                  title: 'Citation Verification',
                  description: 'AI-powered fact-checking. Verify if your citations actually support your claims.',
                  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                  color: 'from-indigo-500 to-purple-500',
                },
                {
                  title: 'Safety Scoring',
                  description: 'Detect unsupported claims, speculation, and potential hallucinations before they become problems.',
                  icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                  color: 'from-yellow-500 to-orange-500',
                },
              ].map((feature, index) => (
                <div key={index} className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 blur transition duration-500 rounded-2xl" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }} />
                  <div className="relative p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                    <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                How ResearchBase works
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Three simple steps to transform your research workflow
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  step: '01',
                  title: 'Upload your sources',
                  description: 'Drop your PDFs and documents. We automatically extract text, generate embeddings, and index everything for instant search.',
                },
                {
                  step: '02',
                  title: 'Write with AI',
                  description: 'Start writing in our rich editor. Use slash commands to summarize, expand, or rewrite. Let AI help you articulate your ideas.',
                },
                {
                  step: '03',
                  title: 'Verify & cite',
                  description: 'Find evidence for your claims, insert citations, and verify them automatically. Export in APA, MLA, Chicago, or BibTeX.',
                },
              ].map((item, index) => (
                <div key={index} className="relative">
                  <div className="text-6xl font-bold text-gray-100 dark:text-gray-800 mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Free during beta. No credit card required.
              </p>
            </div>

            <div className="max-w-lg mx-auto">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25" />
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Beta Access</h3>
                      <p className="text-gray-500 dark:text-gray-400">Everything included</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">$0</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">during beta</div>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {[
                      'Unlimited documents',
                      'AI writing assistance',
                      'PDF source upload',
                      'Ask-Project queries',
                      'Citation verification',
                      'All export formats',
                      'Real-time collaboration',
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className="block w-full text-center px-6 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg transition-all"
                  >
                    Get started free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-16 sm:px-16 sm:py-24">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              <div className="relative text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to transform your research?
                </h2>
                <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
                  Join researchers who are already using AI to write better, faster, and with more confidence.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-8 py-4 rounded-xl text-base font-semibold text-indigo-600 bg-white hover:bg-gray-100 shadow-xl transition-all hover:scale-105"
                >
                  Start for free
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">ResearchBase</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
              <a href="mailto:hello@researchbase.pro" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              &copy; 2025 ResearchBase. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
