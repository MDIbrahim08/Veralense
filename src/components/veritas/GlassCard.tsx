import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [6, -6]);
  const rotateY = useTransform(mouseX, [-300, 300], [-6, 6]);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 1200 }} ref={ref}>
      <motion.div
        style={{ rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative group"
      >
        {/* Ambient glow */}
        <motion.div
          className="absolute -inset-[1px] rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 10px 2px rgba(0,188,212,0.04)',
              '0 0 20px 6px rgba(0,188,212,0.08)',
              '0 0 10px 2px rgba(0,188,212,0.04)',
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Traveling light beams */}
        <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
          {/* Top */}
          <motion.div
            className="absolute top-0 left-0 h-[2px] w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ left: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
            transition={{ left: { duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror' } }}
          />
          {/* Right */}
          <motion.div
            className="absolute top-0 right-0 w-[2px] h-1/2 bg-gradient-to-b from-transparent via-primary to-transparent"
            animate={{ top: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
            transition={{ top: { duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut', delay: 0.6 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 0.6 } }}
          />
          {/* Bottom */}
          <motion.div
            className="absolute bottom-0 right-0 h-[2px] w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ right: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
            transition={{ right: { duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut', delay: 1.2 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.2 } }}
          />
          {/* Left */}
          <motion.div
            className="absolute bottom-0 left-0 w-[2px] h-1/2 bg-gradient-to-b from-transparent via-primary to-transparent"
            animate={{ bottom: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
            transition={{ bottom: { duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut', delay: 1.8 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.8 } }}
          />

          {/* Corner glows */}
          {[['top-0 left-0', 0], ['top-0 right-0', 0.5], ['bottom-0 right-0', 1], ['bottom-0 left-0', 1.5]].map(([pos, delay], i) => (
            <motion.div
              key={i}
              className={`absolute ${pos} w-2 h-2 rounded-full bg-primary/60 blur-[2px]`}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatType: 'mirror', delay: delay as number }}
            />
          ))}
        </div>

        {/* Card surface */}
        <div
          className={`relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden ${className}`}
        >
          {/* Subtle inner grid */}
          <div
            className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
              backgroundSize: '30px 30px',
            }}
          />
          {children}
        </div>
      </motion.div>
    </div>
  );
}
