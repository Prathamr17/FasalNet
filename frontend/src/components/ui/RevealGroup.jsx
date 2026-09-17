import { motion } from "framer-motion";
import { useMotionPreset, staggerContainer } from "../../lib/motion";

export function RevealGroup({ className = "", stagger = 0.08, children, ...rest }) {
  const { viewport } = useMotionPreset();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      variants={staggerContainer(stagger)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ as = "div", variant = "fadeUp", className = "", children, ...rest }) {
  const Comp = motion[as] || motion.div;
  const { variants, transition } = useMotionPreset();
  return (
    <Comp
      className={className}
      variants={variants[variant] || variants.fadeUp}
      transition={transition}
      {...rest}
    >
      {children}
    </Comp>
  );
}
