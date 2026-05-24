'use client';
import Link from 'next/link';
import { Code2, Zap, Users, Brain, Shield, Terminal } from 'lucide-react';

const features = [
  { icon: Users, title: 'Real-Time Collaboration', desc: 'Multiple developers editing simultaneously with live cursors and presence tracking.' },
  { icon: Brain, title: 'AI Pair Programming', desc: 'Code completion, bug detection, refactoring, and an AI chat assistant built-in.' },
  { icon: Terminal, title: 'Multi-Language Execution', desc: 'Run JavaScript, Python, C++, and Java in isolated Docker sandboxes instantly.' },
  { icon: Zap, title: 'Distributed Architecture', desc: 'Socket.IO + Redis Pub/Sub scales across multiple servers for zero downtime.' },
  { icon: Code2, title: 'Version History', desc: 'Full event sourcing with snapshot restore and collaboration replay.' },
  { icon: Shield, title: 'Secure by Default', desc: 'JWT auth, rate limiting, sandboxed execution, and encrypted sessions.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-50">
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">CodeSync AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
          <Link href="/auth/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-32 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary mb-8">
          <Zap className="h-3.5 w-3.5" /> Powered by AI + Distributed Systems
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white to-primary/60 bg-clip-text text-transparent">
          Code Together,<br />Ship Faster
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Production-grade collaborative code editor with real-time sync, AI pair programming,
          multi-language execution, and distributed microservice architecture.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register" className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-all pulse-glow">
            Start Coding Free
          </Link>
          <Link href="/auth/login" className="border border-border px-8 py-3 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need to collaborate</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
              <div className="bg-primary/10 rounded-lg w-10 h-10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Built on Production-Grade Tech</h2>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {['Next.js 15','Node.js','Socket.IO','Redis Pub/Sub','Apache Kafka','PostgreSQL','Docker','Monaco Editor','OpenAI / Claude / Gemini'].map(t => (
              <span key={t} className="bg-secondary border border-border rounded-full px-4 py-1.5 text-muted-foreground">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Code2 className="h-4 w-4" />
          <span className="font-medium text-foreground">CodeSync AI</span>
        </div>
        Distributed AI-Powered Collaborative Code Editor
      </footer>
    </div>
  );
}
