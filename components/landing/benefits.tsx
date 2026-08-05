"use client";

import { CheckCircle, TrendingUp, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const benefits = [
  {
    icon: TrendingUp,
    title: "Boost Productivity",
    description:
      "Empower teams with clear goals and real-time feedback, leading to a significant increase in output.",
  },
  {
    icon: Users,
    title: "Enhance Retention",
    description:
      "Invest in employee growth and recognition to build loyalty and reduce turnover.",
  },
  {
    icon: Zap,
    title: "Drive Engagement",
    description:
      "Foster a culture of continuous improvement and collaboration that keeps everyone motivated.",
  },
];

export default function Benefits() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1], // A nice bouncy ease
      },
    },
  };

  return (
    <section className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left Column: Image */}
          <motion.div
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={imageVariants}
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
                alt="Team collaborating in a modern office"
                layout="fill"
                objectFit="cover"
                className="transform hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          </motion.div>

          {/* Right Column: Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            <span className="text-blue-600 font-semibold">
              Business Outcomes
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2 mb-6">
              Invest in People, Drive Results
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Our platform isn't just about software; it's about creating a
              thriving workplace. Companies that use our system see tangible
              improvements across the board.
            </p>

            <div className="space-y-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={index}
                    className="flex items-start gap-4"
                    variants={itemVariants}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mt-1">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
