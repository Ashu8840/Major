import React from "react";
import { IoBook, IoSparkles } from "react-icons/io5";

const SplashScreen = ({ onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 animate-gradient-shift">
        {/* Floating Shapes */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-float-slow"></div>
        <div className="absolute top-1/4 right-20 w-16 h-16 bg-blue-300/20 rounded-full animate-float-medium"></div>
        <div className="absolute bottom-1/4 left-1/4 w-12 h-12 bg-white/15 rounded-full animate-float-fast"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-200/10 rounded-full animate-float-slow"></div>

        {/* Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center text-white px-8 animate-fade-in-up">
        {/* Logo Section */}
        <div className="mb-8 animate-logo-entrance">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
            {/* Main Logo Icon */}
            <div className="absolute inset-0 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-2xl animate-glow"></div>
            <div className="relative flex items-center justify-center">
              <IoBook className="w-10 h-10 text-white animate-book-flip" />
              {/* AI Spark */}
              <IoSparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1 animate-sparkle" />
            </div>
          </div>

          {/* App Name */}
          <h1 className="text-4xl md:text-5xl font-bold mb-3 animate-text-shine">
            SoulSpace
          </h1>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-blue-100 font-light animate-fade-in-delayed">
            Your Thoughts, Your Space, Your Story
          </p>
        </div>

        {/* Loading Animation */}
        <div className="flex flex-col items-center space-y-4 animate-fade-in-delayed-2">
          {/* Progress Dots */}
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce-1"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce-2"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce-3"></div>
          </div>

          {/* Loading Text */}
          <p className="text-sm text-blue-200 animate-pulse">
            Preparing your digital diary...
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-10 -left-10 w-40 h-40 border border-white/10 rounded-full animate-rotate-slow"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 border border-white/10 rounded-full animate-rotate-reverse"></div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes gradient-shift {
          0%, 100% { background: linear-gradient(135deg, #1D4ED8 0%, #3B82F6 50%, #8B5CF6 100%); }
          25% { background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #6366F1 100%); }
          50% { background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #1D4ED8 100%); }
          75% { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #3B82F6 100%); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(120deg); }
        }

        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(360deg); }
        }

        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes logo-entrance {
          0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          60% { opacity: 1; transform: scale(1.1) rotate(5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 255, 255, 0.5), 0 0 60px rgba(59, 130, 246, 0.3); }
        }

        @keyframes book-flip {
          0%, 90%, 100% { transform: rotateY(0deg); }
          45% { transform: rotateY(180deg); }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          25% { opacity: 0.5; transform: scale(1.2) rotate(90deg); }
          50% { opacity: 1; transform: scale(0.8) rotate(180deg); }
          75% { opacity: 0.7; transform: scale(1.1) rotate(270deg); }
        }

        @keyframes text-shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes fade-in-delayed {
          0% { opacity: 0; transform: translateY(20px); }
          30% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes fade-in-delayed-2 {
          0% { opacity: 0; transform: translateY(20px); }
          60% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes bounce-1 {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }

        @keyframes bounce-2 {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }

        @keyframes bounce-3 {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }

        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotate-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .animate-gradient-shift { animation: gradient-shift 8s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 4s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 3s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 1s ease-out; }
        .animate-logo-entrance { animation: logo-entrance 1.5s ease-out; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-book-flip { animation: book-flip 3s ease-in-out infinite; }
        .animate-sparkle { animation: sparkle 2s ease-in-out infinite; }
        .animate-text-shine { 
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: text-shine 3s ease-in-out infinite;
          background-clip: text;
          -webkit-background-clip: text;
        }
        .animate-fade-in-delayed { animation: fade-in-delayed 2s ease-out; }
        .animate-fade-in-delayed-2 { animation: fade-in-delayed-2 2.5s ease-out; }
        .animate-bounce-1 { animation: bounce-1 1.5s ease-in-out infinite; }
        .animate-bounce-2 { animation: bounce-2 1.5s ease-in-out 0.2s infinite; }
        .animate-bounce-3 { animation: bounce-3 1.5s ease-in-out 0.4s infinite; }
        .animate-rotate-slow { animation: rotate-slow 20s linear infinite; }
        .animate-rotate-reverse { animation: rotate-reverse 15s linear infinite; }
        `,
        }}
      />
    </div>
  );
};

export default SplashScreen;
