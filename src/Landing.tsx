import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Bot,
  Globe,
  Zap,
  Store,
  Users,
  Share2,
  MessageCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Star,
  Palette,
  Type,
  Image,
  Layers,
  Menu,
  X,
  Download,
  HeartHandshake,
  Play,
} from 'lucide-react';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';

/* ─── Inline keyframe styles (no extra CSS file needed) ─── */
const GLOBAL_STYLES = `
  @keyframes float1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(40px,-60px) scale(1.1); }
    66%      { transform: translate(-30px,40px) scale(0.95); }
  }
  @keyframes float2 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(-50px,70px) scale(1.08); }
    66%      { transform: translate(60px,-40px) scale(0.92); }
  }
  @keyframes float3 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(30px,50px) scale(1.05); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes gradShift {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }
  @keyframes scanline {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes glowPulse {
    0%,100% { box-shadow: 0 0 20px 2px rgba(142,116,228,0.35); }
    50%      { box-shadow: 0 0 40px 8px rgba(142,116,228,0.65); }
  }
  @keyframes orbit {
    from { transform: rotate(0deg) translateX(90px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
  }
  @keyframes typewriter {
    from { clip-path: inset(0 100% 0 0); }
    to   { clip-path: inset(0 0% 0 0); }
  }
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-fadeUp   { animation: fadeUp .7s ease both; }
  .anim-delay-100   { animation-delay: .1s; }
  .anim-delay-200   { animation-delay: .2s; }
  .anim-delay-300   { animation-delay: .3s; }
  .anim-delay-400   { animation-delay: .4s; }
  .card-glow:hover  { box-shadow: 0 0 0 1px rgba(142,116,228,0.5), 0 8px 40px rgba(142,116,228,0.18); }
  .btn-glow { animation: glowPulse 2.5s ease-in-out infinite; }
  .ticker-wrap { overflow:hidden; }
  .ticker-track { display:flex; animation: ticker 22s linear infinite; white-space:nowrap; }
`;

const USE_CASES = [
  {
    emoji: '🏪',
    icon: <Store size={22} />,
    title: 'Shop Owner',
    desc: 'Running a local store or selling online? Your AI clone answers "What are your timings?", "Do you have this in stock?", "Cash or card?" — even at 2 AM while you sleep.',
    tag: 'Retail & E-commerce',
  },
  {
    emoji: '💇',
    icon: <Users size={22} />,
    title: 'Freelancer / Salon / Clinic',
    desc: 'Set up your assistant once. It handles appointment queries, service FAQs, and pricing — so you can focus on your craft.',
    tag: 'Service Businesses',
  },
  {
    emoji: '📲',
    icon: <Share2 size={22} />,
    title: 'Social Media Creator',
    desc: 'Drop your chat link in your Instagram bio, WhatsApp status, or Facebook page. Followers get instant replies. You get your time back.',
    tag: 'Creators & Influencers',
  },
  {
    emoji: '🏘️',
    icon: <MessageCircle size={22} />,
    title: 'Community Helper',
    desc: 'A teacher, doctor, or local expert? Let your AI clone share knowledge, answer common questions, and help your community — 24/7.',
    tag: 'Educators & Experts',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Create Your Assistant',
    desc: 'Sign up and describe yourself — your name, what you do, and the questions you usually get asked.',
  },
  {
    step: '02',
    title: 'Teach It Your Knowledge',
    desc: 'Upload a document, paste your FAQs, or just type some info. Your AI clone learns from it instantly.',
  },
  {
    step: '03',
    title: 'Share the Link — Go Live!',
    desc: 'Copy your unique chat link. Paste it anywhere — social profiles, WhatsApp, your website. You\'re live!',
  },
];

const TESTIMONIALS = [
  {
    name: 'Priya M.',
    role: 'Boutique Owner, Mumbai',
    text: 'My assistant answers 50+ questions a day. I haven\'t missed a single customer query since I set it up.',
    stars: 5,
  },
  {
    name: 'Rajan T.',
    role: 'Yoga Instructor, Pune',
    text: 'I pasted the link in my Instagram bio. My students get class schedules and pricing right away. Game changer!',
    stars: 5,
  },
  {
    name: 'Meera K.',
    role: 'Home Baker',
    text: 'Orders used to get lost in DMs. Now my AI assistant handles all the order queries and I just bake. 🎂',
    stars: 5,
  },
];

const APP_LINKS = {
  playStore: 'https://play.google.com/store/apps/details?id=com.sharecare.letchat',
};

const MOBILE_SHOTS = [
  { src: '/marketing/lcss1.jpg', title: 'Personal twin home' },
  { src: '/marketing/lcss6.jpg', title: 'Live notification feed' },
  { src: '/marketing/lcss8.jpg', title: 'Task summary with conclusion' },
];

const LETTY_USE_CASES = [
  {
    title: 'Propose to someone with confidence',
    desc: 'Letty can collect thoughts, timing preferences, and mutual feedback before you send the final message.',
  },
  {
    title: 'Plan a trip with friends',
    desc: 'Ask Letty to coordinate dates, budgets, and destination choices instead of chasing everyone one by one.',
  },
  {
    title: 'Get honest feedback on something',
    desc: 'Share one question and let Letty gather clean responses from the people you trust.',
  },
];

function ScreenshotCarousel() {
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setActive((a) => (a - 1 + MOBILE_SHOTS.length) % MOBILE_SHOTS.length);
  const next = () => setActive((a) => (a + 1) % MOBILE_SHOTS.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -40) next();
    else if (delta > 40) prev();
    touchStartX.current = null;
  };

  return (
    <div className="w-full max-w-md mx-auto select-none">
      <Card className="border-white/10 bg-white/5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <CardContent className="p-4 md:p-5">
          <div
        className="relative overflow-hidden rounded-[1.35rem] bg-[#090912]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {MOBILE_SHOTS.map((slide) => (
                <div key={slide.src} className="min-w-full p-3">
                  <img
                    src={slide.src}
                    alt={slide.title}
                    className="w-full rounded-[1rem] border border-white/10 object-cover"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white transition-colors hover:bg-[#8E74E4]/80"
              aria-label="Previous"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white transition-colors hover:bg-[#8E74E4]/80"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">{MOBILE_SHOTS[active].title}</div>
              <div className="text-xs text-gray-400">Real LetChat mobile screens</div>
            </div>
            <div className="flex gap-2">
              {MOBILE_SHOTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-2 rounded-full transition-all ${i === active ? 'w-6 bg-[#8E74E4]' : 'w-2 bg-white/20'}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * LANDING PAGE COMPONENT
 */
const LandingPage = () => {
  // Unlock body and #root overflow for Landing page only
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalRootOverflow = document.getElementById('root')?.style.overflow;
    document.body.style.overflow = 'auto';
    const root = document.getElementById('root');
    if (root) root.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (root && originalRootOverflow !== undefined) root.style.overflow = originalRootOverflow;
    };
  }, []);
  return (
    <div className="min-h-screen bg-[#0D0D17] text-white selection:bg-purple-500/30 overflow-x-hidden">

      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#0D0D17]/80">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.svg" alt="LetChat logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-xl tracking-tight">LetChat</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#use-cases" className="hover:text-white transition-colors">Use Cases</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Stories</a>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={APP_LINKS.playStore}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#8E74E4]/30 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:border-[#8E74E4]/60 hover:bg-white/10"
          >
            <Play size={12} className="fill-current" />
            Google Play
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300 animate-pulse">
              Pre-registration
            </span>
          </a>
          <button
            onClick={() => window.location.assign('https://admin.letchat.in')}
            className="px-4 py-2 bg-[#8E74E4] hover:bg-[#7a60cc] rounded-full text-sm font-medium transition-all"
          >
            Start Free →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="max-w-6xl mx-auto px-6">

        <section className="pt-20 pb-12 text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8E74E4]/10 text-[#8E74E4] text-xs font-semibold uppercase tracking-wider animate-pulse">
            <Zap size={13} />
            3 Clicks &amp; You're Live
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            Clone Yourself.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8E74E4] via-violet-400 to-indigo-400">
              Be Available 24 × 7.
            </span>
          </h1>

          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Create a personal AI assistant that knows everything about you —
            your work, your prices, your schedule.
            Feed your twin with your knowledge, then attach it to your Instagram bio, WhatsApp, LinkedIn, or website.
            Let it answer questions while you enjoy your life.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => window.location.assign('https://admin.letchat.in')}
              className="w-full sm:w-auto px-8 py-4 bg-[#8E74E4] hover:bg-[#7a60cc] rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 text-white"
            >
              Create My AI Clone — Free <ChevronRight size={18} />
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-all border border-white/10"
            >
              See How It Works
            </button>
          </div>

          <div className="flex justify-center pt-2">
            <a
              href={APP_LINKS.playStore}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#8E74E4]/30 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:border-[#8E74E4]/60 hover:bg-white/10"
            >
              <Play size={14} className="fill-current" />
              Get it on Google Play
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300 animate-pulse">
                Pre-registration
              </span>
            </a>
          </div>

          {/* social proof bar */}
          <div className="flex flex-wrap justify-center gap-6 pt-6 text-sm text-gray-400">
            {['No credit card required', 'Live in under 2 minutes', 'Works on any device'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#8E74E4]" /> {t}
              </span>
            ))}
          </div>
        </section>

        {/* ── Visual Demo Card ── */}
        <section className="flex justify-center pb-20">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-2xl shadow-purple-900/30">
            {/* fake chat bubbles */}
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8E74E4] to-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">AI</div>
                <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-xs text-gray-200">
                  Hi! I'm Priya's assistant. How can I help you today? 👋
                </div>
              </div>
              <div className="flex gap-2 items-start justify-end">
                <div className="bg-[#8E74E4]/80 rounded-2xl rounded-tr-none px-4 py-2.5 max-w-xs text-white">
                  What are your shop timings?
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8E74E4] to-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">AI</div>
                <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-xs text-gray-200">
                  We're open Mon–Sat, 10 AM to 8 PM. Sunday by appointment. Want me to book a slot? 😊
                </div>
              </div>
              <div className="flex gap-2 items-start justify-end">
                <div className="bg-[#8E74E4]/80 rounded-2xl rounded-tr-none px-4 py-2.5 max-w-xs text-white">
                  Yes please, Sunday at 11 AM works!
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8E74E4] to-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">AI</div>
                <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-xs text-gray-200">
                  Done! I've noted Sunday 11 AM for you. Priya will confirm shortly. 🎉
                </div>
              </div>
            </div>
            {/* Product screenshot carousel */}
            {/* <div className="mt-8">
              <ScreenshotCarousel />
            </div> */}
            {/* badge */}
            <div className="absolute -top-3 -right-3 bg-[#8E74E4] text-white text-xs px-3 py-1 rounded-full font-semibold shadow">
              Live 24 × 7
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold uppercase tracking-[0.18em] mb-4">
                <Bot size={13} />
                What LetChat does in simple words
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                Teach your twin once. Let it answer forever.
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Add your documents, links, text notes, and voice knowledge. Your twin learns from that material and answers common questions for you.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">
                Then place your twin link in your Instagram bio, WhatsApp profile, LinkedIn, Facebook, or website so people can ask your bot directly.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  'Explain what you do without repeating yourself again and again.',
                  'Share prices, timings, offers, and FAQs automatically.',
                  'Capture serious intent before you step into the chat.',
                  'Stay available while traveling, sleeping, or working.',
                ].map((point) => (
                  <div key={point} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-200 flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[#8E74E4] shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              {/* <Badge variant="outline" className="mb-4 border-[#8E74E4]/30 bg-[#8E74E4]/8 text-white/90">
                Mobile preview
              </Badge>
              <h3 className="text-xl font-bold mb-2">Product screens in one clean carousel</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                Desktop visitors can now browse the mobile experience clearly, without stacking screenshots all over the page.
              </p> */}
              <ScreenshotCarousel />
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-20">
          <div className="text-center mb-14">
            <span className="text-[#8E74E4] text-sm font-semibold uppercase tracking-widest">As Easy As 1-2-3</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mt-3">
              3 Clicks and You're Live
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto">
              No developers. No complicated setup. Just you, your knowledge, and a link to share.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-[#8E74E4]/40 transition-all group">
                <span className="text-5xl font-black text-[#8E74E4]/20 group-hover:text-[#8E74E4]/40 transition-colors leading-none">{s.step}</span>
                <h3 className="text-xl font-bold mt-3 mb-2">{s.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight size={20} className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-[#8E74E4]/50 z-10" />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <button
              onClick={() => window.location.assign('https://admin.letchat.in')}
              className="px-8 py-4 bg-[#8E74E4] hover:bg-[#7a60cc] rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
            >
              <Sparkles size={18} /> Create My Assistant Now
            </button>
          </div>
        </section>

        {/* ── Use Cases ── */}
        <section id="use-cases" className="py-20">
          <div className="text-center mb-14">
            <span className="text-[#8E74E4] text-sm font-semibold uppercase tracking-widest">Built For Everyone</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mt-3">
              Your AI Clone, Any Role
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto">
              Whether you're a shop owner, a teacher, or a creator — LetChat works for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {USE_CASES.map((u, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-[#8E74E4]/40 transition-all group flex gap-5">
                <div className="text-4xl shrink-0">{u.emoji}</div>
                <div>
                  <span className="text-xs text-[#8E74E4] font-semibold uppercase tracking-wider">{u.tag}</span>
                  <h3 className="text-xl font-bold mt-1 mb-2">{u.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20">
          <div className="text-center mb-14">
            <span className="text-[#8E74E4] text-sm font-semibold uppercase tracking-widest">Meet Letty</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mt-3">
              Letty is your Smart Coordinator.
            </h2>
            <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
              Not every conversation should happen manually. Letty helps you coordinate people, collect replies, and move decisions forward.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {LETTY_USE_CASES.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-white/[0.03] p-7 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
                <div className="w-11 h-11 rounded-2xl bg-[#8E74E4]/15 text-[#8E74E4] flex items-center justify-center mb-4">
                  <HeartHandshake size={18} />
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Chat Studio ── */}
        <section className="py-20">
          <div className="text-center mb-14">
            <span className="text-[#8E74E4] text-sm font-semibold uppercase tracking-widest">Introducing Chat Studio</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mt-3">
              Design Your Chat Like a Pro.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8E74E4] to-indigo-400">
                Brand It Yourself.
              </span>
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto">
              No designer? No problem. Chat Studio gives you a live visual editor to make your assistant
              look and feel exactly like your brand — colours, fonts, logo, and more.
            </p>
          </div>

          {/* Studio preview card */}
          <div className="relative rounded-3xl border border-[#8E74E4]/30 bg-gradient-to-br from-[#8E74E4]/10 to-indigo-900/10 overflow-hidden p-8 md:p-0 flex flex-col md:flex-row gap-0">

            {/* Left: controls panel */}
            <div className="md:w-80 shrink-0 p-8 border-b md:border-b-0 md:border-r border-white/5 space-y-5 flex-col flex">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#8E74E4]/20 flex items-center justify-center text-[#8E74E4]">
                  <Palette size={16} />
                </div>
                <span className="font-bold text-sm">Chat Studio</span>
                <span className="ml-auto text-xs bg-[#8E74E4]/20 text-[#8E74E4] px-2 py-0.5 rounded-full font-semibold">LIVE</span>
              </div>

              {/* colour swatches */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Brand Colour</p>
                <div className="flex gap-2">
                  {['#8E74E4','#e74c8e','#4ce7c3','#e7a34c','#4c8ee7'].map((c) => (
                    <div key={c} style={{ backgroundColor: c }} className="w-7 h-7 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-white/40 transition-all shrink-0" />
                  ))}
                </div>
              </div>

              {/* font style */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Font Style</p>
                <div className="flex gap-2">
                  {['Modern','Serif','Mono'].map((f) => (
                    <div key={f} className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${f === 'Modern' ? 'border-[#8E74E4] bg-[#8E74E4]/15 text-[#8E74E4]' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>{f}</div>
                  ))}
                </div>
              </div>

              {/* toggles */}
              <div className="space-y-3">
                {[
                  { label: 'Show Logo', on: true },
                  { label: 'Show Timestamps', on: false },
                  { label: 'Dark Mode', on: true },
                  { label: 'Emoji Picker', on: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{item.label}</span>
                    <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${item.on ? 'bg-[#8E74E4]' : 'bg-white/10'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${item.on ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <div className="text-xs text-gray-400 mb-2 font-medium">Upload Logo</div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/15 text-gray-500 text-xs cursor-pointer hover:border-[#8E74E4]/50 hover:text-[#8E74E4] transition-all">
                  <Image size={13} /> Drop your logo here
                </div>
              </div>
            </div>

            {/* Right: live chat preview */}
            <div className="flex-1 p-8 flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-[#8E74E4]" />
                <span className="text-xs text-gray-400 font-medium">Live Preview</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0D0D17] overflow-hidden flex flex-col max-w-sm mx-auto w-full shadow-2xl">
                {/* chat header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#8E74E4] to-indigo-500">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">SC</div>
                  <div>
                    <div className="text-white font-bold text-sm leading-none">Priya's Shop</div>
                    <div className="text-white/70 text-xs mt-0.5">Always here to help ✨</div>
                  </div>
                </div>
                {/* messages */}
                <div className="p-4 space-y-3 text-xs">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8E74E4] to-indigo-500 flex items-center justify-center text-white font-bold shrink-0" style={{ fontSize: 9 }}>AI</div>
                    <div className="bg-white/10 rounded-xl rounded-tl-none px-3 py-2 text-gray-200 max-w-[80%]">Hi! What can I help you with today? 😊</div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-[#8E74E4] rounded-xl rounded-tr-none px-3 py-2 text-white max-w-[80%]">Do you deliver to Andheri?</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8E74E4] to-indigo-500 flex items-center justify-center text-white font-bold shrink-0" style={{ fontSize: 9 }}>AI</div>
                    <div className="bg-white/10 rounded-xl rounded-tl-none px-3 py-2 text-gray-200 max-w-[80%]">Yes! Free delivery above ₹499 to Andheri. 🛵</div>
                  </div>
                </div>
                {/* input bar */}
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                    <span className="text-gray-500 text-xs flex-1">Type a message…</span>
                    <div className="w-6 h-6 rounded-lg bg-[#8E74E4] flex items-center justify-center">
                      <ChevronRight size={12} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* feature pills */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: <Palette size={16} />, title: 'Custom Colours', desc: 'Match your brand palette exactly.' },
              { icon: <Type size={16} />, title: 'Font Control', desc: 'Pick the font that feels like you.' },
              { icon: <Image size={16} />, title: 'Logo & Avatar', desc: 'Add your logo or a custom avatar.' },
              { icon: <Layers size={16} />, title: 'Live Preview', desc: 'See every change instantly.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-3 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-[#8E74E4]/40 transition-all items-start">
                <div className="w-8 h-8 rounded-lg bg-[#8E74E4]/15 text-[#8E74E4] flex items-center justify-center shrink-0">{f.icon}</div>
                <div>
                  <div className="font-semibold text-sm">{f.title}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-16">
          <div className="rounded-3xl bg-gradient-to-br from-[#8E74E4]/20 to-indigo-900/20 border border-[#8E74E4]/20 p-10 grid md:grid-cols-3 gap-8 text-center">
            {[
              { value: '24 × 7', label: 'Always-on for your customers', icon: <Clock size={24} /> },
              { value: '2 min', label: 'Average setup time', icon: <Zap size={24} /> },
              { value: '100+', label: 'Languages supported', icon: <Globe size={24} /> },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="text-[#8E74E4]">{s.icon}</div>
                <div className="text-4xl font-black text-white">{s.value}</div>
                <div className="text-gray-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section id="testimonials" className="py-20">
          <div className="text-center mb-14">
            <span className="text-[#8E74E4] text-sm font-semibold uppercase tracking-widest">Real People. Real Results.</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mt-3">
              They Cloned Themselves 😄
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-[#8E74E4]/30 transition-all flex flex-col gap-4">
                <div className="flex gap-1">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 leading-relaxed text-sm flex-1">"{t.text}"</p>
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-20 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-[#8E74E4]/30 to-indigo-900/30 border border-[#8E74E4]/30 px-8 py-16 space-y-6 max-w-2xl mx-auto">
            <div className="text-5xl">🤖</div>
            <h2 className="text-4xl font-extrabold">
              Your AI Clone Is Waiting.
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Stop missing messages. Stop repeating yourself.
              Create your AI assistant in 3 clicks — completely free.
            </p>
            <button
              onClick={() => window.location.assign('https://admin.letchat.in')}
              className="inline-flex items-center gap-2 px-10 py-4 bg-[#8E74E4] hover:bg-[#7a60cc] rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-500/30"
            >
              <Bot size={20} /> Create My AI Clone — Free
            </button>
            <div className="flex flex-col items-center gap-3">
              <p className="text-gray-300 text-sm">Google Play pre-registration is active. App Store coming soon.</p>
              <a
                href={APP_LINKS.playStore}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-sm font-semibold text-white hover:border-[#8E74E4]/60 transition-colors"
              >
                <Download size={15} />
                Join on Google Play
              </a>
            </div>
          </div>
        </section>

      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-white/5 mt-4 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-500 text-sm">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.svg" alt="LetChat logo" className="w-6 h-6 object-contain opacity-60" />
          <span>© 2026 LetChat Inc. All rights reserved.</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white">Privacy</a>
          <a href="#" className="hover:text-white">Terms</a>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return <LandingPage />;
}