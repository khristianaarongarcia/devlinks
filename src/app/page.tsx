import Link from 'next/link'
import { FiArrowRight, FiLink, FiUser, FiBarChart2, FiMoon } from 'react-icons/fi'
import Navbar from '@/components/Navbar'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-300 dark:via-dark-200 dark:to-dark-300">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-fade-in">
            <span className="inline-block px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-sm font-medium mb-6">
              ✨ Your personal link hub
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            All Your Links,{' '}
            <span className="gradient-text">One Place</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto animate-slide-up delay-100">
            Create a beautiful, customizable page to showcase all your important links. 
            Perfect for developers, creators, and professionals.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-200">
            <Link href="/register" className="btn-primary inline-flex items-center justify-center gap-2">
              Get Started Free
              <FiArrowRight />
            </Link>
            <Link href="/demo" className="btn-secondary inline-flex items-center justify-center gap-2">
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Everything you need to{' '}
            <span className="gradient-text">stand out</span>
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<FiLink className="w-6 h-6" />}
              title="Unlimited Links"
              description="Add as many links as you want. Social media, projects, contact info - all in one place."
            />
            <FeatureCard 
              icon={<FiUser className="w-6 h-6" />}
              title="Custom Profile"
              description="Personalize your page with your photo, bio, and custom colors to match your brand."
            />
            <FeatureCard 
              icon={<FiBarChart2 className="w-6 h-6" />}
              title="Click Analytics"
              description="Track how many people click your links with simple, privacy-friendly analytics."
            />
            <FeatureCard 
              icon={<FiMoon className="w-6 h-6" />}
              title="Dark Mode"
              description="Beautiful dark and light themes that adapt to your visitors' preferences."
            />
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-gray-100 dark:to-dark-200">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-dark-100 rounded-3xl shadow-2xl p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                JD
              </div>
              <h3 className="text-2xl font-bold mb-2">John Developer</h3>
              <p className="text-gray-600 dark:text-gray-400">Full Stack Developer | Open Source Enthusiast</p>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <PreviewLink title="🌐 Portfolio Website" />
              <PreviewLink title="💼 LinkedIn" />
              <PreviewLink title="🐙 GitHub" />
              <PreviewLink title="🐦 Twitter" />
              <PreviewLink title="📧 Email Me" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to create your DevLinks page?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Join thousands of developers showcasing their work.
          </p>
          <Link href="/register" className="btn-primary inline-flex items-center gap-2">
            Create Your Page
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-600 dark:text-gray-400">
          <p>© 2024 DevLinks. Built with ❤️ by developers, for developers.</p>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-white dark:bg-dark-100 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

function PreviewLink({ title }: { title: string }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-dark-200 rounded-xl text-center font-medium hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors cursor-pointer link-card">
      {title}
    </div>
  )
}
