import {
  ChevronRight,
  Bot,
  Globe,
  Shield,
  Zap
} from 'lucide-react';

/**
 * LANDING PAGE COMPONENT
 */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0D0D17] text-white selection:bg-purple-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="LetChat logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-xl tracking-tight">LetChat</span>
          </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Product</a>
          <a href="#" className="hover:text-white transition-colors">Solutions</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
        </div>
        <button
          onClick={() => window.location.assign('https://admin.letchat.in')}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium transition-all"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <div className="text-center space-y-8">
         <div className="flex flex-col items-center gap-3">
            <span className="text-3xl font-extrabold tracking-tight text-[#8E74E4]">LetChat</span>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8E74E4]/10 text-[#8E74E4] text-xs font-semibold uppercase tracking-wider animate-pulse">
              <Zap size={14} />
              Next Gen AI Support
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Elevate your customer <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8E74E4] to-indigo-400">
              engagement strategy.
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Integrate powerful AI assistants into your website in seconds. No coding required. 
            Scale your support without scaling your team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => window.location.assign('https://admin.letchat.in')}
              className="w-full sm:w-auto px-8 py-4 bg-[#8E74E4] hover:bg-[#7a60cc] rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              Get Started Free <ChevronRight size={18} />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-all border border-white/10">
              View Documentation
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-32">
          {[
            { icon: <Globe />, title: 'Global Reach', desc: 'Support 100+ languages automatically with native-level fluency.' },
            { icon: <Shield />, title: 'Enterprise Secure', desc: 'End-to-end encryption and SOC2 compliance out of the box.' },
            { icon: <Bot />, title: 'Smart Context', desc: 'Assistants learn from your docs, website, and past conversations.' }
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-[#8E74E4]/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#8E74E4]/10 text-[#8E74E4] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-white/5 mt-20 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-500 text-sm">
        <div>© 2026 LetChat Inc. All rights reserved.</div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white">Privacy</a>
          <a href="#" className="hover:text-white">Terms</a>
          {/* <a href="#" className="flex items-center gap-1 hover:text-white"><Github size={16} /> GitHub</a> */}
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return <LandingPage />;
}