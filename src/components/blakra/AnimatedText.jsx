import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import useTextAnimation from '../../hooks/useTextAnimation';

/**
 * AnimatedText Component
 * Handles staggered character/word reveals with various animation modes
 */
const AnimatedText = ({
  children,
  mode = 'character', // 'character', 'word', or 'line'
  className = '',
  delay = 0,
  staggerDelay = 0.03,
  duration = 0.6,
  variant = 'slideUp', // 'slideUp', 'slideDown', 'fade', 'blur', 'scale'
  as = 'div',
  onAnimationComplete,
  viewportThreshold = 0.3,
  ...props
}) => {
  const { variants, easing } = useTextAnimation();

  // Split text based on mode
  const segments = useMemo(() => {
    if (!children || typeof children !== 'string') return [];

    if (mode === 'character') {
      return children.split('').map((char, i) => ({
        id: i,
        text: char,
        type: 'char',
      }));
    }

    if (mode === 'word') {
      return children.split(' ').map((word, i) => ({
        id: i,
        text: word,
        type: 'word',
      }));
    }

    if (mode === 'line') {
      return children.split('\n').map((line, i) => ({
        id: i,
        text: line,
        type: 'line',
      }));
    }

    return [];
  }, [children, mode]);

  // Animation variants
  const animVariants = {
    hidden: {
      slideUp: { opacity: 0, y: 24 },
      slideDown: { opacity: 0, y: -24 },
      fade: { opacity: 0 },
      blur: { opacity: 0, filter: 'blur(8px)' },
      scale: { opacity: 0, scale: 0.9 },
    },
    visible: {
      slideUp: {
        opacity: 1,
        y: 0,
        transition: { duration, ease: easing.easeOutQuart },
      },
      slideDown: {
        opacity: 1,
        y: 0,
        transition: { duration, ease: easing.easeOutQuart },
      },
      fade: {
        opacity: 1,
        transition: { duration: duration * 0.8 },
      },
      blur: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: { duration, ease: easing.easeOutQuart },
      },
      scale: {
        opacity: 1,
        scale: 1,
        transition: { duration, ease: easing.easeOutElastic },
      },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const Component = motion[as] || motion.div;

  return (
    <Component
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: viewportThreshold }}
      onAnimationComplete={onAnimationComplete}
      {...props}
    >
      {segments.map((segment) => (
        <motion.span
          key={segment.id}
          variants={animVariants}
          className="inline-block"
          style={{ whiteSpace: segment.text === ' ' ? 'pre' : 'normal' }}
        >
          {segment.text}
        </motion.span>
      ))}
    </Component>
  );
};

export default AnimatedText;
