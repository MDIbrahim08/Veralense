"use client";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface WordPullUpProps {
  words: string;
  delayMultiple?: number;
  wrapperFramerProps?: Variants;
  framerProps?: Variants;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

export function WordPullUp({
  words,
  wrapperFramerProps = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
  framerProps = {
    hidden: { y: 10, opacity: 0 },
    show: { y: 0, opacity: 1 },
  },
  className,
  as = "h1",
}: WordPullUpProps) {
  const MotionComponent = motion[as as keyof typeof motion] as any;

  return (
    <MotionComponent
      variants={wrapperFramerProps}
      initial="hidden"
      animate="show"
      className={cn(
        "font-display drop-shadow-sm",
        className,
      )}
    >
      {words.split(" ").map((word, i) => (
        <motion.span
          key={i}
          variants={framerProps}
          style={{ display: "inline-block", paddingRight: "4px" }}
        >
          {word === "" ? <span>&nbsp;</span> : word}
        </motion.span>
      ))}
    </MotionComponent>
  );
}
