import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import AnimatedText from './AnimatedText';
import SplitText from './SplitText';
import MagneticText from './MagneticText';
import GradientText from './GradientText';

/**
 * TextAnimationShowcase Component
 * Demonstrates all available text animation types
 * Can be used for demonstration or removed
 */
export default function TextAnimationShowcase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24 px-8"
      style={{ background: '#050407', minHeight: '100vh' }}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16"
        >
          <div className="w-4 h-[1px] bg-accent/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-accent/35">Text Animations</span>
        </motion.div>

        <h2 className="font-grotesk text-[clamp(40px,8vw,100px)] font-bold tracking-[-0.05em] leading-none text-white mb-4">
          Advanced Typography
        </h2>
        <p className="font-inter text-[14px] md:text-[16px] leading-relaxed max-w-2xl"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Explore the full range of text animation capabilities designed for Awwwards-level design impact.
        </p>
      </div>

      {/* Animation Showcase Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 mb-20">
        {/* 1. Character Reveal */}
        <div className="relative p-8 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 text-white/40">
            Character Reveal
          </h3>
          <AnimatedText
            as="h4"
            mode="character"
            className="font-grotesk text-3xl font-bold text-white mb-4"
            delay={0.2}
            staggerDelay={0.04}
            duration={0.7}
            variant="slideUp"
          >
            Staggered reveal
          </AnimatedText>
          <p className="font-inter text-sm text-white/25">
            Each character appears sequentially with a smooth easing curve for dramatic effect.
          </p>
        </div>

        {/* 2. Word Reveal */}
        <div className="relative p-8 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 text-white/40">
            Word Reveal
          </h3>
          <AnimatedText
            as="h4"
            mode="word"
            className="font-grotesk text-3xl font-bold text-white mb-4"
            delay={0.2}
            staggerDelay={0.1}
            duration={0.8}
            variant="slideUp"
          >
            Words appear one by one
          </AnimatedText>
          <p className="font-inter text-sm text-white/25">
            Perfect for headlines and statements that need emphasis and timing control.
          </p>
        </div>

        {/* 3. Split Text Top */}
        <div className="relative p-8 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 text-white/40">
            Split Reveal (Top)
          </h3>
          <SplitText
            as="h4"
            direction="top"
            className="font-grotesk text-3xl font-bold text-white mb-4"
            delay={0.2}
            duration={1}
          >
            Splits from the top down
          </SplitText>
          <p className="font-inter text-sm text-white/25">
            Text appears by clipping from top to bottom for a cinematic reveal.
          </p>
        </div>

        {/* 4. Split Text Bottom */}
        <div className="relative p-8 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 text-white/40">
            Split Reveal (Bottom)
          </h3>
          <SplitText
            as="h4"
            direction="bottom"
            className="font-grotesk text-3xl font-bold text-white mb-4"
            delay={0.2}
            duration={1}
          >
            Splits from bottom up
          </SplitText>
          <p className="font-inter text-sm text-white/25">
            Inverted split for alternative reveal patterns and visual rhythm.
          </p>
        </div>

        {/* 5. Blur Reveal */}
        <div className="relative p-8 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 text-white/40">
            Blur Reveal
          </h3>
          <AnimatedText
            as="h4"
            mode="character"
            className="font-grotesk text-3xl font-bold text-white mb-4"
            delay={0.2}
            staggerDelay={0.03}
            duration={0.8}
            variant="blur"
          >
            Fades into focus
          </AnimatedText>
          <p className="font-inter text-sm text-white/25">
            Characters appear with a blur effect that clears for a soft, elegant entrance.
          </p>
        </div>

        {/* 6. Scale Reveal */}
        <div className="relative p-8 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 text-white/40">
            Scale + Rotate
          </h3>
          <AnimatedText
            as="h4"
            mode="character"
            className="font-grotesk text-3xl font-bold text-white mb-4"
            delay={0.2}
            staggerDelay={0.04}
            duration={0.8}
            variant="scale"
          >
            Bounces in
          </AnimatedText>
          <p className="font-inter text-sm text-white/25">
            Playful scale and rotation reveal with elastic easing for energetic feel.
          </p>
        </div>

        {/* 7. Magnetic Text */}
        <div className="relative p-8 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 text-white/40">
            Magnetic Text
          </h3>
          <div className="h-16 flex items-center justify-center">
            <MagneticText
              className="font-grotesk text-3xl font-bold text-white cursor-pointer"
              intensity={0.3}
              radius={200}
            >
              Move cursor here
            </MagneticText>
          </div>
          <p className="font-inter text-sm text-white/25 mt-4">
            Text follows and distorts with cursor proximity for interactive feel.
          </p>
        </div>

        {/* 8. Gradient Text */}
        <div className="relative p-8 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase mb-8 text-white/40">
            Animated Gradient
          </h3>
          <GradientText
            className="font-grotesk text-3xl font-bold mb-4"
            colors={['#8b5cf6', '#06b6d4', '#ec4899']}
            direction="to-right"
            animate={true}
            duration={4}
          >
            Flowing gradient
          </GradientText>
          <p className="font-inter text-sm text-white/25">
            Gradient animates smoothly across the text for eye-catching emphasis.
          </p>
        </div>
      </div>

      {/* Usage Section */}
      <div className="max-w-7xl mx-auto bg-white/[0.02] border border-white/[0.08] rounded-lg p-8">
        <h3 className="font-grotesk text-2xl font-bold text-white mb-6">Quick Usage Examples</h3>
        
        <div className="space-y-6 font-mono text-sm text-white/60">
          <div>
            <p className="text-white/40 mb-2">Character Stagger</p>
            <pre className="bg-black/30 p-4 rounded overflow-x-auto text-xs">
{`<AnimatedText mode="character" variant="slideUp">
  Your headline here
</AnimatedText>`}
            </pre>
          </div>

          <div>
            <p className="text-white/40 mb-2">Split Reveal</p>
            <pre className="bg-black/30 p-4 rounded overflow-x-auto text-xs">
{`<SplitText direction="bottom" duration={1.2}>
  Text that splits from bottom up
</SplitText>`}
            </pre>
          </div>

          <div>
            <p className="text-white/40 mb-2">Magnetic Text</p>
            <pre className="bg-black/30 p-4 rounded overflow-x-auto text-xs">
{`<MagneticText intensity={0.3} radius={200}>
  Interactive text
</MagneticText>`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
