"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  BookOpen,
  Award,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description:
      "Monitor KPIs and employee progress in real-time with automated scoring and insights.",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Target,
    title: "Goal Management",
    description:
      "Set, track, and manage SMART goals with clear milestones and manager feedback loops.",
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    icon: Award,
    title: "Employee Recognition",
    description:
      "Foster a positive culture by celebrating top performers and key milestones.",
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  {
    icon: Users,
    title: "360° Feedback",
    description:
      "Gather comprehensive peer reviews and feedback to support holistic employee growth.",
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Visualize team trends, identify skill gaps, and generate insightful reports with ease.",
    bgColor: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    icon: BookOpen,
    title: "Development Plans",
    description:
      "Connect training opportunities to development goals and track learning outcomes.",
    bgColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
];

export default function Features() {
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <section id="features" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={itemVariants}
        >
          <span className="text-blue-600 font-semibold">Core Features</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            An HR Platform Built for Performance
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Everything you need to build a high-performing, engaged, and
            development-focused team.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white rounded-xl">
                  <CardHeader className="flex flex-row items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${feature.bgColor}`}
                    >
                      <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
