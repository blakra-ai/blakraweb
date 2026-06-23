import { useRef, useEffect, useState } from 'react';

/**
 * Hook for managing text animation states and variants
 * Provides easing curves and animation presets for text
 */
export const useTextAnimation = () => {
  // Custom easing curves
  const easing = {
    easeInOutCubic: [0.645, 0.045, 0.355, 1],
    easeOutQuart: [0.165, 0.84, 0.44, 1],
    easeOutQuint: [0.22, 1, 0.36, 1],
    easeOutElastic: [0.34, 1.56, 0.64, 1],
  };

  // Animation presets
  const variants = {
    // Character stagger reveal
    containerStagger: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.03,
          delayChildren: 0.1,
        },
      },
    },

    // Individual character
    charReveal: {
      hidden: { opacity: 0, y: 24 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.6,
          ease: easing.easeOutQuart,
        },
      },
    },

    // Word stagger
    wordContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.08,
          delayChildren: 0.15,
        },
      },
    },

    wordReveal: {
      hidden: { opacity: 0, y: 32, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.8,
          ease: easing.easeOutQuint,
        },
      },
    },

    // Split reveal (top/bottom)
    splitTop: {
      hidden: { opacity: 0, y: -48, clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)' },
      visible: {
        opacity: 1,
        y: 0,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        transition: {
          duration: 1,
          ease: easing.easeOutQuint,
        },
      },
    },

    splitBottom: {
      hidden: { opacity: 0, y: 48, clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' },
      visible: {
        opacity: 1,
        y: 0,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        transition: {
          duration: 1,
          ease: easing.easeOutQuint,
        },
      },
    },

    // Gradient flow (for text-based gradient animations)
    gradientFlow: {
      hidden: { backgroundPosition: '-200% 0' },
      visible: {
        backgroundPosition: '200% 0',
        transition: {
          duration: 1.5,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        },
      },
    },

    // Blur + reveal
    blurReveal: {
      hidden: { opacity: 0, filter: 'blur(12px)' },
      visible: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: {
          duration: 0.9,
          ease: easing.easeOutQuart,
        },
      },
    },

    // Scale + rotate reveal
    scaleReveal: {
      hidden: { opacity: 0, scale: 0.85, rotateZ: -2 },
      visible: {
        opacity: 1,
        scale: 1,
        rotateZ: 0,
        transition: {
          duration: 0.8,
          ease: easing.easeOutElastic,
        },
      },
    },
  };

  return { easing, variants };
};

export default useTextAnimation;
