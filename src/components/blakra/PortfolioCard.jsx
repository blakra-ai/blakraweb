import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const PortfolioCard = ({
  id,
  code,
  title,
  category,
  description,
  impact,
  impactLabel,
  image,
  tags,
  hue,
  index,
  isInView,
  onClick,
  className = '',
}) => {
  const ref = useRef(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-lg border backdrop-blur-sm transition-all duration-500 cursor-pointer ${className}`}
      style={{
        borderColor: 'rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.008) 100%)',
      }}
    >
      {/* Hover glow effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, hsla(${hue},80%,65%,0.15), transparent)`,
        }}
      />

      {/* Image container */}
      <div className="relative h-56 md:h-64 overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
        {image ? (
          <motion.img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-32 h-32 rounded-lg opacity-10"
              style={{
                background: `radial-gradient(circle, hsla(${hue},80%,65%,0.5), transparent)`,
                filter: 'blur(40px)',
              }}
            />
          </div>
        )}

        {/* Code badge */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded font-mono text-[8px] tracking-[0.2em] uppercase backdrop-blur-md"
          style={{
            background: `hsla(${hue},80%,65%,0.1)`,
            border: `1px solid hsla(${hue},80%,65%,0.3)`,
            color: `hsla(${hue},80%,65%,0.8)`,
          }}
        >
          {code}
        </div>
      </div>

      {/* Content container */}
      <div className="p-5 md:p-6 relative z-10">
        {/* Category label */}
        <div className="font-mono text-[8px] tracking-[0.3em] uppercase mb-2"
          style={{ color: `hsla(${hue},80%,65%,0.6)` }}
        >
          {category}
        </div>

        {/* Title */}
        <h3 className="font-grotesk text-lg md:text-xl font-bold tracking-tight mb-2 text-white group-hover:opacity-90 transition-opacity duration-300">
          {title}
        </h3>

        {/* Description */}
        <p className="font-inter font-light text-xs md:text-sm leading-relaxed mb-4"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {description}
        </p>

        {/* Impact metric */}
        {impact && (
          <div className="mb-4 pb-4 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
          >
            <p className="font-grotesk font-bold leading-none tracking-[-0.02em] mb-1"
              style={{
                fontSize: '24px',
                color: `hsla(${hue},80%,65%,0.85)`,
                textShadow: `0 0 20px hsla(${hue},80%,65%,0.25)`,
              }}
            >
              {impact}
            </p>
            <p className="font-mono text-[8px] tracking-[0.2em] uppercase"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {impactLabel}
            </p>
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[7px] tracking-[0.15em] uppercase px-2 py-1 rounded"
                style={{
                  background: `hsla(${hue},80%,65%,0.08)`,
                  color: `hsla(${hue},80%,65%,0.6)`,
                  border: `1px solid hsla(${hue},80%,65%,0.15)`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom accent bar — lights up on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(to right, hsla(${hue},80%,65%,0), hsla(${hue},80%,65%,0.8), hsla(${hue},80%,65%,0))`,
        }}
      />
    </motion.div>
  );
};

export default PortfolioCard;
