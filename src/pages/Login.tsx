import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// --- Custom Colors based on the mockup ---
const THEME = {
  bg: '#FAF8F5',       // Light cream background (default, overridden dynamically)
  maroon: '#5A1A22',   // Deep maroon for buttons and logo text
  gold: '#B68D5D',     // Gold for accents
  textPrimary: '#3A2E2B',
  textSecondary: '#857F7A',
  border: '#E8E4DB',
};

export const Login: React.FC = () => {
  // Strip any global themes (dark mode, awesome mode) on mount so entry stays isolated
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark', 'light', 'awesome');
  }, []);

  const [step, setStep] = useState<0 | 1>(0);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(username, password);
      // Routing is handled by the guard layer in main.tsx
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Animation Variants ---
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
    }),
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const fadeUpItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center font-sans antialiased overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: THEME.bg }}
    >
      <div 
        className="w-full max-w-[428px] h-screen sm:h-[812px] sm:rounded-[2.5rem] relative overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 transition-colors duration-500"
        style={{ backgroundColor: THEME.bg }}
      >
        
        <AnimatePresence initial={false} custom={step === 1 ? 1 : -1} mode="wait">
          
          {/* =========================================
              STEP 0: WELCOME SCREEN
              ========================================= */}
          {step === 0 && (
            <motion.div
              key="welcome"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ isolation: 'isolate' }}
              className="absolute inset-0 flex flex-col items-center justify-between px-8 py-16"
            >
              {/* Background Animated Elements */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] pointer-events-none opacity-[0.15]"
                style={{ 
                  background: `radial-gradient(circle at 50% 50%, ${THEME.gold} 0%, transparent 60%)`,
                  mixBlendMode: 'multiply'
                }}
              />

              {/* Top Spacer - Increased flex grow to push logo down towards the true center */}
              <div className="flex-[1.5]" />

              {/* Logo & Branding */}
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="flex flex-col items-center z-10 w-full"
              >
                <motion.div variants={fadeUpItem}>
                  <img 
                    src="/nukood-logo.png" 
                    alt="Nukood Logo" 
                    className="w-[300px] object-contain"
                  />
                </motion.div>

                {/* Separator Star */}
                <motion.div variants={fadeUpItem} className="flex items-center gap-4 w-full justify-center opacity-70 my-8 mt-12">
                  <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-[#B68D5D]" />
                  <motion.svg 
                    animate={{ rotate: 180 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={THEME.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" fill={THEME.gold} stroke="none"/>
                  </motion.svg>
                  <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#B68D5D]" />
                </motion.div>

                <motion.p 
                  variants={fadeUpItem}
                  className="text-[13px] tracking-[0.2em] font-medium uppercase mt-2 text-center"
                  style={{ color: THEME.maroon }}
                >
                  Plan wise. Live free.
                </motion.p>
              </motion.div>

              {/* Bottom Section */}
              <div className="flex-1 flex flex-col justify-end pb-8 z-10 w-full">
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="flex flex-col items-center"
                >
                  <p 
                    className="text-center text-[15px] font-medium leading-relaxed mb-10 opacity-80"
                    style={{ color: THEME.textPrimary }}
                  >
                    Take control of your money.<br/>
                    Build the life you want.
                  </p>

                  <button
                    onClick={() => setStep(1)}
                    className="group relative w-full h-14 rounded-full flex items-center justify-center gap-3 text-white text-sm tracking-[0.15em] font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-xl overflow-hidden"
                    style={{ backgroundColor: THEME.maroon }}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    <span className="relative z-10">GET STARTED</span>
                    <ArrowRight size={18} strokeWidth={2} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}


          {/* =========================================
              STEP 1: SIGN IN FORM
              ========================================= */}
          {step === 1 && (
            <motion.div
              key="signin"
              custom={-1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ isolation: 'isolate' }}
              className="absolute inset-0 flex flex-col px-8 py-12"
            >
              
              {/* Header bar */}
              <div className="flex justify-between items-center mb-8">
                <button 
                  onClick={() => setStep(0)}
                  className="p-3 -ml-3 rounded-full transition-colors hover:bg-black/5 active:scale-95"
                  style={{ color: THEME.maroon }}
                >
                  <ArrowLeft size={22} strokeWidth={2} />
                </button>
                
                <motion.svg 
                  animate={{ rotate: 90 }}
                  transition={{ duration: 0.5 }}
                  width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                >
                   <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" fill="none" stroke={THEME.gold} strokeWidth="1.5"/>
                </motion.svg>
              </div>

              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="flex flex-col w-full"
              >
                {/* Logo & Title */}
                <motion.div variants={fadeUpItem} className="flex flex-col items-center mb-10">
                  <img 
                    src="/nukood-logo.png" 
                    alt="Nukood Logo" 
                    className="w-28 object-contain mb-6"
                  />
                  
                  <h3 className="text-2xl font-semibold tracking-wide" style={{ color: THEME.maroon, fontFamily: '"Playfair Display", serif' }}>
                    Welcome Back
                  </h3>
                  <p className="text-[13px] mt-2 font-medium" style={{ color: THEME.textSecondary }}>
                    Sign in to continue your journey
                  </p>
                </motion.div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                  
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="flex items-center gap-2 p-3 bg-red-50/80 text-red-700 rounded-xl text-[13px] font-medium border border-red-100"
                      >
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Username Input */}
                  <motion.div variants={fadeUpItem} className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#5A1A22]" style={{ color: THEME.textSecondary }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full h-[56px] rounded-2xl pl-12 pr-4 bg-white/50 border transition-all duration-300 focus:bg-white focus:shadow-md text-[15px] outline-none font-medium placeholder:text-[#B4B0AB]"
                      placeholder="Email or Username"
                      style={{ borderColor: THEME.border, color: THEME.textPrimary }}
                    />
                  </motion.div>

                  {/* Password Input */}
                  <motion.div variants={fadeUpItem} className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#5A1A22]" style={{ color: THEME.textSecondary }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full h-[56px] rounded-2xl pl-12 pr-12 bg-white/50 border transition-all duration-300 focus:bg-white focus:shadow-md text-[15px] outline-none font-medium placeholder:text-[#B4B0AB]"
                      placeholder="Password"
                      style={{ borderColor: THEME.border, color: THEME.textPrimary }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                      className="absolute inset-y-0 right-2 px-3 flex items-center justify-center rounded-xl transition-colors hover:bg-black/5"
                      style={{ color: THEME.textSecondary }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </motion.div>

                  <motion.div variants={fadeUpItem} className="flex justify-end w-full">
                    <button type="button" className="text-[13px] font-semibold transition-all hover:opacity-70" style={{ color: THEME.maroon }}>
                      Forgot password?
                    </button>
                  </motion.div>

                  <motion.button
                    variants={fadeUpItem}
                    type="submit"
                    disabled={isSubmitting || !username || !password}
                    className="group relative w-full h-[56px] mt-2 rounded-2xl flex items-center justify-center gap-3 text-white text-[14px] tracking-[0.1em] font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 overflow-hidden"
                    style={{ backgroundColor: THEME.maroon }}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {isSubmitting ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        SIGN IN
                      </>
                    )}
                  </motion.button>
                </form>

                {/* OR divider */}
                <motion.div variants={fadeUpItem} className="flex items-center gap-4 w-full justify-center my-8 opacity-60">
                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent to-[#B68D5D]" />
                  <span className="text-[11px] font-bold tracking-widest" style={{ color: THEME.textPrimary }}>OR</span>
                  <div className="h-[1px] w-full bg-gradient-to-l from-transparent to-[#B68D5D]" />
                </motion.div>

                {/* Google Sign In */}
                <motion.button
                  variants={fadeUpItem}
                  type="button"
                  className="group relative w-full h-[56px] rounded-2xl flex items-center justify-center gap-3 text-[14px] font-semibold transition-all active:scale-[0.98] bg-white border hover:shadow-md overflow-hidden"
                  style={{ 
                    borderColor: THEME.border,
                    color: THEME.textPrimary,
                  }}
                >
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="relative z-10">Continue with Google</span>
                </motion.button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
