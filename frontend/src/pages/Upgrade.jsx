import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  IoCheckmark,
  IoStar,
  IoHeart,
  IoChatbubble,
  IoBook,
  IoCloud,
  IoShield,
  IoAnalytics,
} from "react-icons/io5";

const Upgrade = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("pro");

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with your personal diary",
      buttonText: "Current Plan",
      buttonClass: "bg-gray-400 text-white cursor-not-allowed",
      popular: false,
      features: [
        "5 diary entries per month",
        "1 community post per day",
        "Basic chat with 3 contacts",
        "Basic AI writing assistance",
        "Public community access",
        "Standard templates",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: "$9",
      period: "per month",
      description:
        "Advanced features for passionate writers and active community members",
      buttonText: "Upgrade to Pro",
      buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
      popular: true,
      features: [
        "Unlimited diary entries",
        "Unlimited community posts",
        "Chat with up to 50 contacts",
        "Advanced AI writing & mood analysis",
        "Priority community features",
        "Premium templates & themes",
        "Export diary to PDF",
        "Advanced analytics",
        "Cloud backup (10GB)",
        "Email support",
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "$19",
      period: "per month",
      description:
        "Ultimate experience for content creators and community leaders",
      buttonText: "Upgrade to Premium",
      buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
      popular: false,
      features: [
        "Everything in Pro",
        "Unlimited chat contacts",
        "AI-powered content suggestions",
        "Custom community groups",
        "Advanced mood tracking & insights",
        "Collaboration features",
        "Custom templates designer",
        "Priority support",
        "Cloud backup (100GB)",
        "API access",
        "White-label options",
        "Advanced security",
      ],
    },
  ];

  const handleUpgrade = (planId) => {
    if (planId === "free") return;
    // Here you would integrate with payment processor
    console.log(`Upgrading to ${planId} plan`);
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-900 dark:text-white mb-4">
            Upgrade Your Diary Experience
          </h1>
          <p className="text-base sm:text-lg text-blue-600 dark:text-gray-300 max-w-2xl mx-auto">
            Choose the perfect plan to unlock premium features and enhance your
            personal journaling and community engagement
          </p>
        </div>

        {/* Current Plan Info */}
        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-8 border border-blue-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  You're currently on plan:
                </p>
                <p className="font-semibold text-blue-900 dark:text-white">
                  Free
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-500 dark:text-gray-400">
                  Upgrade to unlock premium features and unlimited access
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-xl p-8 border-2 transition-all duration-300 ${
                plan.popular
                  ? "border-blue-500 shadow-xl scale-105"
                  : "border-blue-100 dark:border-gray-700 hover:border-blue-300 hover:shadow-lg"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1">
                    <IoStar className="w-4 h-4" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-blue-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-blue-600 dark:text-gray-300 text-sm mb-4">
                  {plan.description}
                </p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-blue-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-blue-500 dark:text-gray-400 ml-2">
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="mb-8">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <IoCheckmark className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-blue-800 dark:text-gray-300 text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 ${plan.buttonClass}`}
                disabled={plan.id === "free"}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-blue-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-blue-900 dark:text-white mb-8 text-center">
            What You Get With Premium
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <IoBook className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-white mb-2">
                Unlimited Entries
              </h3>
              <p className="text-sm text-blue-600 dark:text-gray-400">
                Write as much as you want with no monthly limits
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <IoHeart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-white mb-2">
                Mood Analytics
              </h3>
              <p className="text-sm text-blue-600 dark:text-gray-400">
                Track your emotional journey with AI insights
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <IoChatbubble className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-white mb-2">
                Enhanced Chat
              </h3>
              <p className="text-sm text-blue-600 dark:text-gray-400">
                Connect with unlimited community members
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <IoCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-white mb-2">
                Cloud Backup
              </h3>
              <p className="text-sm text-blue-600 dark:text-gray-400">
                Never lose your precious memories and thoughts
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-blue-900 dark:text-white mb-6">
            Questions? We're Here to Help
          </h2>
          <p className="text-blue-600 dark:text-gray-300 mb-6">
            Contact our support team for any questions about upgrading your
            account
          </p>
          <button
            onClick={() => navigate("/support")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
