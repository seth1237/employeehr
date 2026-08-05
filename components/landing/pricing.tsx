"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "For small teams just getting started.",
    features: [
      "Up to 50 employees",
      "Performance Tracking",
      "Goal Management",
      "Standard Reporting",
      "Email Support",
    ],
    cta: "Choose Starter",
    popular: false,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For growing businesses that need more power.",
    features: [
      "Up to 250 employees",
      "All Starter Features",
      "360° Feedback",
      "Advanced Analytics",
      "Integration APIs",
      "Priority Support",
    ],
    cta: "Choose Professional",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with custom needs.",
    features: [
      "Unlimited employees",
      "All Professional Features",
      "Dedicated Account Manager",
      "Custom Integrations (SAML, SSO)",
      "On-premise Option",
      "24/7 Phone Support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
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
    <section id="pricing" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={itemVariants}
        >
          <span className="text-blue-600 font-semibold">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Find the Perfect Plan
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Simple, transparent pricing that scales with your company. No hidden
            fees.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`relative flex flex-col ${
                plan.popular ? "-translate-y-4" : ""
              }`}
            >
              <Card
                className={`w-full flex-grow flex flex-col rounded-xl shadow-sm transition-all duration-300 ${
                  plan.popular
                    ? "border-2 border-blue-600 shadow-2xl shadow-blue-500/10"
                    : "border-gray-200/80"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <CardHeader className="pt-10">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  <p className="text-gray-500">{plan.description}</p>
                  <div className="flex items-baseline gap-1 pt-4">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  <div className="space-y-4 flex-grow">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check
                          size={18}
                          className="text-green-500 flex-shrink-0 mt-1"
                        />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="lg"
                    className={`w-full mt-8 font-bold text-base py-6 ${
                      plan.popular
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white hover:bg-gray-100 text-blue-600 border-2 border-blue-600"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
