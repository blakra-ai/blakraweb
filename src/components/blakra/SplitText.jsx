import React from 'react';
import { motion } from 'framer-motion';
import useTextAnimation from '../../hooks/useTextAnimation';

/**
 * SplitText Component
 * Text reveal animation that splits from top and bottom
 */
const SplitText = ({
  children,
  className = '',
  delay = 0,
  duration = 1,
  direction = 'both', // 'top', 'bottom', or 'both'
  stagger = false,
  staggerDelay = 0.1,
  as = 'div',
  viewportThreshold = 0.3,
  onAnimationComplete,
  ...props
}) => {
  const { variants, easing } = useTextAnimation();

  // Split by lines if multiple lines
  const lines = typeof children === 'string' 
    ? children.split('\n').filter(line => line.trim() !== '')
    : [children];

  const containerVariants = stagger ? {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  } : {};

  const lineVariants = {
    top: {
      hidden: {
        opacity: 0,
        y: -48,
        clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)',
      },
      visible: {
        opacity: 1,
        y: 0,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        transition: {
          duration,
          ease: easing.easeOutQuint,
        },
      },
    },
    bottom: {
      hidden: {
        opacity: 0,
        y: 48,
        clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
      },
      visible: {
        opacity: 1,
        y: 0,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        transition: {
          duration,
          ease: easing.easeOutQuint,
        },
      },
    },
    both: {
      hidden: {
        opacity: 0,
        clipPath: 'polygon(0 50%, 100% 50%, 100% 50%, 0 50%)',
      },
      visible: {
        opacity: 1,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        transition: {
          duration,
          ease: easing.easeOutQuint,
        },
      },
    },
  };

  const Component = motion[as] || motion.div;

  return (
    <Component
      className={className}
      variants={stagger ? containerVariants : {}}
      initial={stagger ? 'hidden' : 'hidden'}
      whileInView={stagger ? 'visible' : 'visible'}
      viewport={{ once: true, amount: viewportThreshold }}
      onAnimationComplete={onAnimationComplete}
      {...props}
    >
      {lines.map((line, idx) => (
        <motion.div
          key={idx}
          variants={stagger ? lineVariants[direction] : lineVariants[direction]}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: viewportThreshold }}
          transition={stagger ? undefined : {
            duration,
            delay: delay + (idx * staggerDelay),
            ease: easing.easeOutQuint,
          }}
        >
          {line}
        </motion.div>
      ))}
    </Component>
  );
};

export default SplitText;
