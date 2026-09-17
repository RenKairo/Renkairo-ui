import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Briefcase,
  Github,
  Minus,
  Square,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { ToriiIcon } from '../common/ToriiIcon';

export const LoginPage: React.FC = () => {
  const { 
    setAuthModalOpen, 
    user, 
    isAuthenticated, 
    logout, 
    isLoading, 
    setLoading, 
    authError, 
    setAuthError 
  } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form Fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [showPassword, setShowPassword] = useState(false);

  // Simple direct login handler (No workspace credentials prompts)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!usernameOrEmail.trim() || !password.trim()) {
          throw new Error('Please enter both email/username and password.');
        }
        await authService.login(usernameOrEmail.trim(), password);
        setAuthModalOpen(false);
      } else {
        if (!regUsername.trim() || !regEmail.trim() || !password.trim()) {
          throw new Error('Please complete all registration fields.');
        }
        await authService.register(regUsername.trim(), regEmail.trim(), password, role);
        setAuthModalOpen(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoRole: string) => {
    setAuthError(null);
    setLoading(true);
    try {
      const demoEmail = demoRole === 'admin' ? 'admin@renkairo.io' : 'developer@renkairo.io';
      await authService.login(demoEmail, 'renkairo2026');
      setAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex overflow-hidden select-none font-sans bg-[#f8f7f4]">
      {/* ========================================================= */}
      {/* LEFT HALF: DARK JAPANESE INK WASH ARTWORK & BRANDING      */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[45%] h-full bg-[#0d0e12] bg-[url('/bg_dark_moon.jpg')] bg-cover bg-center relative flex flex-col justify-between p-10 text-white overflow-hidden shrink-0 border-r border-zinc-800">
        
        {/* Dark Overlay Gradient for High Contrast & Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/60 pointer-events-none" />

        {/* --- Top Left: Brand Header --- */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            {/* Torii Gate Emblem Box */}
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center p-1.5 shadow-md">
              <ToriiIcon color="#e11d48" className="w-5 h-5 drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
                RenKairo <span className="text-[#e11d48] font-extrabold">IDE</span>
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono tracking-wider">
                Build · Train · Deploy · Anywhere
              </p>
            </div>
          </div>
        </div>

        {/* --- Middle Left: Hero Copy --- */}
        <div className="relative z-10 my-auto max-w-md">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-[1.25] mb-4">
            Your Gateway to <br />
            <span className="text-white font-extrabold">
              Next-Gen AI Engineering
            </span>
          </h2>
          <p className="text-sm text-zinc-400 font-normal leading-relaxed">
            Cloud power. Local freedom.<br />
            All in one place.
          </p>
        </div>

        {/* --- Bottom Left: Quote --- */}
        <div className="relative z-10 pt-6 border-t border-zinc-800/80">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-[2px] bg-[#e11d48]" />
            <p className="text-xs text-zinc-400 font-serif italic tracking-wide">
              “Ideas today. Intelligent tomorrow.”
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT HALF: CLEAN WHITE BACKGROUND (NO BACKGROUND IMAGE)   */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[55%] h-full bg-[#f8f7f4] relative flex flex-col justify-between overflow-y-auto">
        
        {/* Top Window Controls Bar */}
        <div className="w-full flex items-center justify-end px-6 py-4 space-x-4 text-zinc-400 z-20">
          <button 
            onClick={() => setAuthModalOpen(false)}
            className="hover:text-zinc-700 transition-colors p-1"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setAuthModalOpen(false)}
            className="hover:text-zinc-700 transition-colors p-1"
            title="Maximize"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setAuthModalOpen(false)}
            className="hover:text-rose-600 transition-colors p-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center Card Container */}
        <div className="flex-1 flex items-center justify-center p-6 z-10">
          <div className="w-full max-w-[440px] bg-white rounded-2xl p-8 shadow-[0_10px_35px_rgba(0,0,0,0.06)] border border-zinc-100">
            
            {/* Logged in state view */}
            {isAuthenticated && user ? (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#e11d48] to-rose-500 text-white font-bold font-mono text-2xl flex items-center justify-center mx-auto shadow-md">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 font-mono">{user.username}</h3>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-rose-50 text-[#e11d48] font-mono text-[11px] font-semibold border border-rose-200">
                    {user.role}
                  </span>
                </div>
                <div className="pt-4 border-t border-zinc-100 space-y-3">
                  <button
                    onClick={() => setAuthModalOpen(false)}
                    className="w-full h-11 rounded-xl bg-[#e11d48] text-white font-semibold text-xs hover:bg-[#be123c] transition-all shadow-sm cursor-pointer"
                  >
                    Open Workspace →
                  </button>
                  <button
                    onClick={logout}
                    className="w-full h-10 rounded-xl bg-zinc-100 text-zinc-600 font-medium text-xs hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              /* Login / Register Form Card */
              <div>
                {/* Card Title & Subtitle */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-normal">
                    {mode === 'login' 
                      ? 'Login to continue to RenKairo IDE' 
                      : 'Register for RenKairo developer access'}
                  </p>
                </div>

                {/* Error Banner */}
                {authError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'login' ? (
                    /* LOGIN INPUTS */
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <input
                            type="text"
                            value={usernameOrEmail}
                            onChange={(e) => setUsernameOrEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-700 focus:outline-none"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Forgot Password Link */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => alert("Contact your RenKairo administrator to reset password.")}
                          className="text-xs font-semibold text-[#e11d48] hover:underline focus:outline-none"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </>
                  ) : (
                    /* REGISTER INPUTS */
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Username
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <input
                            type="text"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                            placeholder="e.g. renkairo_dev"
                            className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <input
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Developer Role
                        </label>
                        <div className="relative">
                          <Briefcase className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-[#e11d48] transition-all appearance-none cursor-pointer"
                          >
                            <option value="DEVELOPER">Software Developer</option>
                            <option value="AI_ENGINEER">AI / ML Engineer</option>
                            <option value="CLOUD_ARCHITECT">Cloud Architect</option>
                            <option value="PRINCIPAL_ENGINEER">Principal Systems Engineer</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create password"
                            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#e11d48] focus:ring-1 focus:ring-[#e11d48] transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-700 focus:outline-none"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Primary Login Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 mt-3 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-rose-600/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Login' : 'Create Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider: or continue with */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200" />
                  </div>
                  <span className="relative bg-white px-3 text-[11px] text-zinc-400 font-medium">
                    or continue with
                  </span>
                </div>

                {/* Quick Access / Identity Provider Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('developer')}
                    className="h-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Github className="w-4 h-4 text-zinc-800" />
                    <span>Developer Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin')}
                    className="h-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <User className="w-4 h-4 text-rose-600" />
                    <span>Admin Demo</span>
                  </button>
                </div>

                {/* Toggle mode link */}
                <div className="mt-6 text-center text-xs text-zinc-500">
                  {mode === 'login' ? (
                    <p>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('register'); setAuthError(null); }}
                        className="text-[#e11d48] font-semibold hover:underline focus:outline-none"
                      >
                        Sign up
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setAuthError(null); }}
                        className="text-[#e11d48] font-semibold hover:underline focus:outline-none"
                      >
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="w-full px-8 py-4 flex items-center justify-between text-[11px] text-zinc-400 z-10">
          <span>© 2024 RenKairo. All rights reserved.</span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
