import Link from 'next/link';
import { ChevronLeft, MapPin, Clock, CheckCircle, Users, Link2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function BuddiesPage() {
  return (
    <main className="min-h-screen bg-[#EAF5EA]">
      <div className="mx-auto max-w-3xl">
        



        <header className="bg-emerald-600 px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white">
              <ChevronLeft className="h-6 w-6" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <h1 className="text-xl font-semibold text-white">Find Buddy</h1>
            </div>
          </div>
        </header>

        <div className="px-5 pb-24 pt-6">
          


          <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Your Journey</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-600" />
                <div>
                  <span className="text-sm font-medium text-slate-600">To: </span>
                  <span className="font-semibold text-slate-900">Abbey Street</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-slate-600" />
                <div>
                  <span className="text-sm font-medium text-slate-600">Departure: </span>
                  <span className="font-semibold text-slate-900">9:50 AM</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-slate-600" />
                <div>
                  <span className="text-sm font-medium text-slate-600">Safest Route: </span>
                  <span className="font-semibold text-slate-900">14min</span>
                </div>
              </div>
            </div>
          </div>

          
          <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-white">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-semibold">2 cyclists found nearby</span>
          </div>

        
          <div className="space-y-4">
            
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                  <Users className="h-6 w-6 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">Sarah M.</h3>
                  <p className="text-sm text-slate-600">From:</p>
                  <p className="text-base font-semibold text-emerald-600">95% Route Match</p>
                </div>
              </div>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700">
                <Link2 className="h-5 w-5" />
                Connect
              </button>
            </div>

            
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                  <Users className="h-6 w-6 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">James K.</h3>
                  <p className="text-sm text-slate-600">From:</p>
                  <p className="text-base font-semibold text-slate-600">12% Route Match</p>
                </div>
              </div>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700">
                <Link2 className="h-5 w-5" />
                Connect
              </button>
            </div>
          </div>

        
          <button className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-700">
            Join Group Ride
          </button>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}