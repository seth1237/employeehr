"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Zap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section className="w-full bg-white">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Content */}
          <motion.div
            className="space-y-6 text-center md:text-left"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.15,
                },
              },
            }}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                <Zap size={16} className="text-blue-600" />
                Next-Gen HR Management
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight"
              variants={fadeInUp}
            >
              Elevate Your Workforce Potential
            </motion.h1>

            <motion.p
              className="text-lg text-gray-600 max-w-xl mx-auto md:mx-0"
              variants={fadeInUp}
            >
              Our all-in-one HR platform simplifies everything from performance
              reviews to payroll, empowering you to build a thriving workplace
              culture.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-4"
              variants={fadeInUp}
            >
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 py-6 shadow-lg hover:shadow-blue-500/30 transition-all"
                >
                  Get Started Free
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto font-bold text-base px-8 py-6"
                >
                  Learn More
                </Button>
              </Link>
            </motion.div>

            <motion.div
              className="pt-4 text-sm text-gray-500 flex items-center justify-center md:justify-start gap-4"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>No credit card needed</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Image/Graphic */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <div className="aspect-square relative">
              <div className="absolute -top-8 -left-8 w-32 h-32 bg-blue-100 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-100 rounded-full blur-2xl"></div>
              
              <Card className="relative w-full h-full bg-white/60 backdrop-blur-lg shadow-2xl rounded-2xl border-gray-200/50 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Team Performance</h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">This Quarter</span>
                  </div>
                  <div className="space-y-4">
                    {/* Mock graph */}
                    <div className="w-full h-32 bg-gray-100 rounded-lg p-2 flex items-end gap-1">
                        <div className="w-1/4 h-1/2 bg-blue-300 rounded-t-md"></div>
                        <div className="w-1/4 h-3/4 bg-blue-400 rounded-t-md"></div>
                        <div className="w-1/4 h-2/3 bg-blue-300 rounded-t-md"></div>
                        <div className="w-1/4 h-full bg-blue-500 rounded-t-md"></div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="text-left">
                            <p className="text-xs text-gray-500">Engagement</p>
                            <p className="font-bold text-gray-800">82%</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Goals Met</p>
                            <p className="font-bold text-gray-800">95%</p>
                        </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
