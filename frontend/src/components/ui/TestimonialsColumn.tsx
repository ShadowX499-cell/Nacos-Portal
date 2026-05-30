import React from 'react';
import { motion } from 'motion/react';

export interface Testimonial {
  text: string;
  image: string;
  name: string;
  role: string;
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className} style={{ overflow: 'hidden' }}>
      <motion.div
        animate={{ translateY: '-50%' }}
        transition={{
          duration: props.duration ?? 10,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[...Array(2)].map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <div
                key={i}
                className="p-7 rounded-3xl border border-gray-200 shadow-lg shadow-brand-900/5 max-w-xs w-full bg-white"
              >
                <p className="text-gray-600 text-sm leading-relaxed italic">"{text}"</p>
                <div className="flex items-center gap-3 mt-5">
                  <img
                    width={40}
                    height={40}
                    src={image}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-gray-900 leading-tight">{name}</span>
                    <span className="text-xs text-gray-500 leading-tight mt-0.5">{role}</span>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};
