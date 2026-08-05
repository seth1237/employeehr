"use client";

import { motion } from "framer-motion";
import { Users, Settings, Rocket, BarChart } from "lucide-react";

const steps = [
  {
    icon: Users,
    title: "1. Set Up Your Workspace",
    description:
      "Easily create your company profile and invite your entire team to the platform in just a few clicks.",
  },
  {
    icon: Settings,
    title: "2. Configure Your Metrics",
    description:
      "Define performance indicators and goals that align perfectly with your business objectives.",
  },
  {
    icon: Rocket,
    title: "3. Launch & Collaborate",
    description:
      "Initiate performance reviews, facilitate feedback, and empower managers and employees to collaborate on growth.",
  },
  {
    icon: BarChart,
    title: "4. Analyze & Elevate",
    description:
      "Leverage real-time analytics to gain valuable insights, recognize achievements, and drive continuous improvement.",
  },
];

export default function HowItWorks() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 md:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={itemVariants}
        >
          <span className="text-blue-600 font-semibold">How It Works</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our intuitive process makes it simple to elevate your team's
            performance.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* The connecting line */}
          <div
            className="hidden md:block absolute top-10 left-10 right-10 h-0.5 bg-gray-200"
            aria-hidden="true"
          ></div>
          <div
            className="md:hidden absolute top-10 left-10 bottom-10 w-0.5 bg-gray-200"
            aria-hidden="true"
          ></div>

          <div className="grid md:grid-cols-4 gap-8 md:gap-16 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  className="text-center relative"
                  variants={itemVariants}
                >
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-white border-4 border-gray-200 rounded-full flex items-center justify-center relative z-10">
                      <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center">
                        <Icon className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-gray-600">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
