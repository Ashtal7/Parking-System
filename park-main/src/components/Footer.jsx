import { Car, Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white/5 backdrop-blur-xl border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-xl font-bold tracking-tight text-white">ParkSmart</span>
            </div>
            <p className="text-slate-400 max-w-xs mb-6 text-sm leading-relaxed">
              Making urban parking stress-free with real-time availability and seamless booking.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-white/5 p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-all border border-white/5"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="bg-white/5 p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-all border border-white/5"><Github className="h-5 w-5" /></a>
              <a href="#" className="bg-white/5 p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-all border border-white/5"><Mail className="h-5 w-5" /></a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white mb-6 uppercase text-xs tracking-[0.2em]">Product</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Find Parking</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Business Solutions</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white mb-6 uppercase text-xs tracking-[0.2em]">Company</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-slate-500 text-xs font-medium">
            © {new Date().getFullYear()} ParkSmart. All rights reserved.
          </p>
          <div className="flex space-x-6 text-xs font-medium text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
