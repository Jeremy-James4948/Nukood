import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

// Neuomorphic styles consistent with the rest of the app
const neuIndent = "shadow-[inset_2px_2px_4px_#d1cfc7,inset_-2px_-2px_4px_#ffffff]";
const neuExtrude = "shadow-[4px_4px_8px_#d1cfc7,-4px_-4px_8px_#ffffff]";

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(username, password);
      // Navigation is handled by the router/auth guard, but we can explicitly navigate too
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center font-sans">
      <div className={`w-full max-w-[428px] p-8 m-4 rounded-[32px] bg-[#F5F2EC] ${neuExtrude} flex flex-col items-center`}>
        
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight text-[#355C7D] mb-2">Nukood</h1>
          <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">
            Development Mode
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-[16px] text-sm font-medium border border-red-100">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#6A6356] pl-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              className={`w-full h-[56px] rounded-[20px] bg-[#F5F2EC] px-6 text-[16px] font-medium text-[#6A6356] placeholder-[#A49F96] outline-none focus:ring-2 focus:ring-[#355C7D]/20 transition-all ${neuIndent}`}
              placeholder="Enter development username"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#6A6356] pl-2">Password</label>
            <div className={`relative w-full h-[56px] rounded-[20px] bg-[#F5F2EC] ${neuIndent} flex items-center`}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-full bg-transparent px-6 text-[16px] font-medium text-[#6A6356] placeholder-[#A49F96] outline-none pr-12"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                className="absolute right-4 text-[#A49F96] hover:text-[#6A6356] transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !username || !password}
            className={`mt-4 w-full h-[64px] rounded-[24px] bg-[#355C7D] text-white text-[18px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_16px_rgba(53,92,125,0.3)]`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
