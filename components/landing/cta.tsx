"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CTA() {
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
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative rounded-2xl p-10 md:p-16 text-center overflow-hidden bg-blue-600"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={itemVariants}
        >
          {/* Background pattern */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: "url('/path-to-your-pattern.svg')" }} // Add a subtle pattern if you have one
          ></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90"></div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Ready to Elevate Your Team?
            </h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
              Join hundreds of forward-thinking companies. Start your journey
              towards a more engaged, productive, and successful workforce
              today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white hover:bg-gray-100 text-blue-600 font-bold text-base px-8 py-6 shadow-lg"
                >
                  Start Free Trial
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto font-bold text-base px-8 py-6 text-white border-white/50 hover:bg-white/10 hover:text-white"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-blue-200 mt-6">
              14-day free trial &middot; No credit card required
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
