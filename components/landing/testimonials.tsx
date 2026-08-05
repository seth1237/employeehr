"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "HR Director, TechCorp",
    content:
      "This platform transformed our performance reviews. The process is now faster, more transparent, and genuinely developmental. Our managers are more effective coaches, and employee engagement has soared.",
    avatar: "/avatars/sarah.jpg", // Replace with actual image paths
  },
  {
    name: "Michael Chen",
    role: "CEO, Growth Industries",
    content:
      "The analytics dashboard is a game-changer. We finally have a clear, data-driven view of our entire organization's performance, allowing us to make smarter strategic decisions about our talent.",
    avatar: "/avatars/michael.jpg",
  },
  {
    name: "Emma Rodriguez",
    role: "Operations Manager, ScaleUp Co",
    content:
      "As a fast-growing company, we needed a system that could scale with us. This platform was intuitive to set up and has simplified our entire HR process, from onboarding to performance management.",
    avatar: "/avatars/emma.jpg",
  },
];

export default function Testimonials() {
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
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
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={itemVariants}
        >
          <span className="text-blue-600 font-semibold">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Loved by Teams Worldwide
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hear from HR leaders and executives who have transformed their
            workplaces with our platform.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full flex flex-col bg-gray-50 border-gray-200/60 rounded-xl shadow-sm">
                <CardContent className="p-8 flex-grow flex flex-col">
                  <Quote className="w-8 h-8 text-blue-300 mb-4" />
                  <p className="text-gray-700 italic flex-grow">
                    "{testimonial.content}"
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    {/* <div className="w-12 h-12 rounded-full overflow-hidden">
                       <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      /> 
                    </div> */}
                    <div>
                      <p className="font-bold text-gray-900">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
