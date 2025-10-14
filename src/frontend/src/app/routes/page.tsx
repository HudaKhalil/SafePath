export default function RoutesPage() {
  return (
    <main className="min-h-screen bg-[#EAF5EA] px-5 py-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">
        Your Routes
      </h1>
      <p className="text-slate-600 mb-6">
        Plan your safest or fastest ride below 🚴‍♀
      </p>

      <div className="rounded-2xl overflow-hidden shadow-md bg-white">
        {/* Example Map Placeholder */}
        <div className="w-full h-[400px] bg-gray-200 flex items-center justify-center text-gray-500">
          Map will go here
        </div>
      </div>
    </main>
  );
}