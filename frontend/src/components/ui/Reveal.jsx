import { motion } from "framer-motion";
import { useMotionPreset } from "../../lib/motion";

/**
 * Scroll-triggered reveal. Animates once when it enters the viewport (never
 * re-triggers on re-scroll), and collapses to a plain fade when the user
 * has requested reduced motion.
 */
export default function Reveal({
  as = "div",
  variant = "fadeUp",
  delay = 0,
  className = "",
  children,
  ...rest
}) {
  const Comp = motion[as] || motion.div;
  const { variants, transition, viewport } = useMotionPreset();

  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      variants={variants[variant] || variants.fadeUp}
      transition={{ ...transition, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
