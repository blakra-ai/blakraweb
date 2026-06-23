import React from 'react';
import { motion } from 'framer-motion';

/**
 * GradientText Component
 * Animated gradient text effect (flowing, pulsing, etc)
 */
const GradientText = ({
  children,
  className = '',
  colors = ['#1084d0', '#1dd1a1', '#ff6b9d'], // Default colors
  direction = 'to-right', // 'to-right', 'to-bottom', 'diagonal'
  animate = true, // Enable animation
  duration = 3,
  ...props
}) => {
  // Map direction to gradient angle
  const angleMap = {
    'to-right': '90deg',
    'to-bottom': '180deg',
    'diagonal': '135deg',
  };

  const angle = angleMap[direction] || '90deg';

  // Create gradient string
  const gradientStops = colors.map((color, i) => {
    const position = (i / (colors.length - 1)) * 100;
    return `${color} ${position}%`;
  }).join(', ');

  const backgroundImage = `linear-gradient(${angle}, ${gradientStops})`;
  const backgroundSize = animate ? '200% 200%' : '100% 100%';

  const variants = {
    initial: {
      backgroundPosition: '0% 50%',
    },
    animate: {
      backgroundPosition: animate ? ['0% 50%', '100% 50%', '0% 50%'] : '0% 50%',
      transition: {
        duration,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'linear',
      },
    },
  };

  return (
    <motion.span
      className={className}
      style={{
        backgroundImage,
        backgroundSize,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'inline-block',
      }}
      variants={animate ? variants : {}}
      initial={animate ? 'initial' : {}}
      animate={animate ? 'animate' : {}}
      {...props}
    >
      {children}
    </motion.span>
  );
};

export default GradientText;
