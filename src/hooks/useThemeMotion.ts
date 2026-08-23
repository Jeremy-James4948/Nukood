import { useTheme } from 'next-themes';
import { useReducedMotion } from 'motion/react';

export function useThemeMotion() {
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  // If accessibility requires reduced motion, disable or dramatically flatten animations
  if (prefersReducedMotion) {
    return {
      variants: {
        pageEnter: {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3 }
        },
        tapScale: { scale: 1 },
        hoverScale: { scale: 1 },
        slideUp: {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3 }
        }
      }
    };
  }

  // Determine motion personality based on theme
  const isAwesome = theme === 'awesome';
  const isLight = theme === 'light';

  return {
    variants: {
      pageEnter: {
        initial: { opacity: 0, scale: isAwesome ? 0.95 : 0.98 },
        animate: { opacity: 1, scale: 1 },
        transition: { 
          duration: isLight ? 0.3 : 0.5, 
          ease: isAwesome ? "backOut" : "easeOut" 
        }
      },
      tapScale: {
        scale: isAwesome ? 0.9 : 0.95,
        transition: { type: 'spring', stiffness: 400, damping: isAwesome ? 15 : 20 }
      },
      hoverScale: {
        scale: isAwesome ? 1.05 : 1.02,
        transition: { type: 'spring', stiffness: 300, damping: isAwesome ? 15 : 20 }
      },
      slideUp: {
        initial: { opacity: 0, y: isAwesome ? 40 : 20 },
        animate: { opacity: 1, y: 0 },
        transition: { 
          duration: isLight ? 0.4 : 0.6, 
          ease: isAwesome ? "backOut" : "easeOut",
          delay: 0.1 
        }
      },
      staggerContainer: {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            staggerChildren: isAwesome ? 0.15 : 0.1
          }
        }
      },
      staggerItem: {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 }
      }
    }
  };
}
