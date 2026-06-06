import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Shield, Clock, Smartphone, ArrowRight, Car, IndianRupee } from 'lucide-react';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.900),transparent)] opacity-20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold mb-6 border border-blue-500/20">
                <Car className="h-4 w-4" />
                <span>Now available in Bangalore & Mysore</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Find your perfect <span className="text-blue-500">parking spot</span> in seconds.
              </h1>
              <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
                ParkSmart helps you locate, navigate, and book parking spaces in real-time. Save time, fuel, and stress with our intelligent parking network.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 group"
                >
                  <span>Start Parking Now</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/rent-parking"
                  className="bg-white/5 text-white border border-white/10 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center space-x-2 backdrop-blur-sm"
                >
                  <IndianRupee className="h-5 w-5 text-blue-400" />
                  <span>Rent My Spot</span>
                </Link>
              </div>

              <div className="mt-10 flex items-center space-x-6 text-sm text-slate-500">
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>1000+ Spots</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Real-time availability</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Secure Booking</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="bg-slate-900 rounded-3xl p-4 shadow-2xl overflow-hidden aspect-[4/3] relative">
                <img
                  src="https://pictures.porsche.com/rtt/iris?COSY-EU-100-1711coMvsi60AAt5FwcmBEgA4qP8iBUDxPE3Cb9pNXkBuNYdMGF4tl3U0%25z8rMH8spbWvanYb%255y%25oq%25vSTmjMXD4qAZeoNBPUSfUx4RmHlCgI7Zl2dioCxkF%25vUqCNwuWXsO7QNeV6iTxjgzhRc2LUjqA7fQrmVOJUPYDImTB8VuyY0oVk0DBRlqvzpQNqjdtAsvyJ5I"
                  alt="Parking Dashboard"
                  className="w-full h-full object-cover rounded-2xl opacity-80"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 h-24 w-24 bg-blue-100 rounded-full -z-10 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-blue-200 rounded-full -z-10 blur-3xl opacity-50" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-3">Why ParkSmart?</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Everything you need for stress-free parking</p>
            <div className="h-1.5 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <MapPin className="h-8 w-8 text-blue-400" />,
                title: "Smart Search",
                desc: "Find parking spots near your destination with ease using our intelligent search."
              },
              {
                icon: <Clock className="h-8 w-8 text-blue-400" />,
                title: "Real-time Data",
                desc: "Get live updates on spot availability and pricing before you even arrive."
              },
              {
                icon: <Shield className="h-8 w-8 text-blue-400" />,
                title: "Secure Booking",
                desc: "Reserve your spot in advance and pay securely through our platform."
              },
              {
                icon: <Smartphone className="h-8 w-8 text-blue-400" />,
                title: "Easy Navigation",
                desc: "Get turn-by-turn directions directly to your reserved parking spot."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-white/20 transition-all shadow-2xl"
              >
                <div className="mb-6 bg-blue-500/10 w-16 h-16 rounded-2xl flex items-center justify-center border border-blue-500/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rent Section */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/5 relative">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/5 -skew-x-12 translate-x-1/4" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center p-12 md:p-20 relative z-10">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Have an empty parking space?</h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  Join our community of hosts and start earning passive income by renting out your driveway, garage, or commercial parking lot. It's free to list and you keep 100% of your earnings.
                </p>
                <div className="space-y-4 mb-10">
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="bg-blue-500/10 p-1 rounded border border-blue-500/20">
                      <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    </div>
                    <span>Set your own prices and availability</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="bg-blue-500/10 p-1 rounded border border-blue-500/20">
                      <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    </div>
                    <span>Secure payments directly to your account</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <div className="bg-blue-500/10 p-1 rounded border border-blue-500/20">
                      <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    </div>
                    <span>Verified drivers and insurance coverage</span>
                  </div>
                </div>
                <Link
                  to="/rent-parking"
                  className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 inline-flex items-center space-x-2"
                >
                  <span>List Your Space</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="bg-slate-900 rounded-3xl p-4 shadow-2xl overflow-hidden aspect-[4/3] relative">
                  <img
                    src="https://pictures.porsche.com/rtt/iris?COSY-EU-100-1711coMvsi60AAt5FwcmBEgA4qP8iBUDxPE3Cb9pNXkBuNYdMGF4tl3U0%25z8rMH8spbWvanYb%255y%25oq%25vSTmjMXD4qAZeoNBPUSfUx4RmHlCgI7Zl2dioCxkF%25vUqCNwuWXsO7QNeV6iTxjgzhRc2LUjqA7fQrmVOJUPYDImTB8VuyY0oVk0DBRlqvzpQNqjdtAsvyJ5I"
                    alt="Parking Dashboard"
                    className="w-full h-full object-cover rounded-2xl opacity-80"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-6 -right-6 h-24 w-24 bg-blue-100 rounded-full -z-10 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-blue-200 rounded-full -z-10 blur-3xl opacity-50" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to find your next parking spot?</h2>
          <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
            Join thousands of drivers who have simplified their daily commute with ParkSmart. Sign up today and get your first booking free.
          </p>
          <Link
            to="/register"
            className="bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl inline-flex items-center space-x-2"
          >
            <span>Create Free Account</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function CheckCircle2({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}
