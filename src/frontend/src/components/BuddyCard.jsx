
'use client';

export default function BuddyCard({ buddy }) {
  const handleConnect = () => {
    console.log('Connecting with', buddy.name);
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
      {/* Profile Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-16 h-16 ${buddy.color} rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
          {buddy.initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-sp-title mb-1">{buddy.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
              {buddy.type}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-sp-ink">{buddy.rating}</span>
              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-sp-inkMuted mt-1">{buddy.location} • {buddy.description}</p>
        </div>
      </div>

      {/* Preferred Routes */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-sp-ink mb-2">Preferred Routes:</h4>
        <ul className="space-y-1.5">
          {buddy.routes.map((route, index) => (
            <li key={index} className="text-sm text-sp-inkMuted flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="truncate">{route}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Availability */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-sp-ink mb-2">Available:</h4>
        <div className="flex flex-wrap gap-2">
          {buddy.availability.map((slot, index) => (
            <span 
              key={index}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-teal-50 text-teal-700"
            >
              {slot}
            </span>
          ))}
        </div>
      </div>

      {/* Last Active */}
      <div className="flex items-center gap-1.5 text-xs text-sp-inkMuted mb-4">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        <span>Last active: {buddy.lastActive}</span>
      </div>

      {/* Connect Button */}
      <button 
        onClick={handleConnect}
        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
        </svg>
        Connect
      </button>
    </div>
  );
}