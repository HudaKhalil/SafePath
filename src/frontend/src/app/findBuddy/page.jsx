export default function FindBuddy() {
  const buddies = [
    { 
      initials: 'AM', 
      name: 'Alex M.', 
      type: 'Cyclist', 
      rating: '4.5', 
      location: 'Central London • Regular Commuter',
      routes: ['Kings Cross → London Bridge', 'Camden → City of London'],
      available: ['Mon-Fri', 'Morning', 'Evening'],
      lastActive: '2 hours ago'
    },
    { 
      initials: 'SJ', 
      name: 'Sarah J.', 
      type: 'Pedestrian', 
      rating: '4.7', 
      location: 'East London • Student',
      routes: ['Victoria Park → Mile End', 'Canary Wharf → Greenwich'],
      available: ['Tue-Thu', 'Afternoon', 'Weekend'],
      lastActive: '1 hour ago'
    },
    { 
      initials: 'MR', 
      name: 'Mike R.', 
      type: 'Cyclist', 
      rating: '4.5', 
      location: 'West London • Professional',
      routes: ['Hammersmith → Westminster', 'Kensington → Paddington'],
      available: ['Daily', 'Morning'],
      lastActive: '30 minutes ago'
    },
    { 
      initials: 'LT', 
      name: 'Lisa T.', 
      type: 'Pedestrian', 
      rating: '5.0', 
      location: 'South London • Fitness Enthusiast',
      routes: ['Clapham → Waterloo', 'Brixton → London Bridge'],
      available: ['Mon-Fri', 'Evening'],
      lastActive: '45 minutes ago'
    },
    { 
      initials: 'JK', 
      name: 'James K.', 
      type: 'Cyclist', 
      rating: '4.6', 
      location: 'North London • Night Shift Worker',
      routes: ['Islington → King\'s Cross', 'Highbury → Arsenal'],
      available: ['Mon-Fri', 'Night'],
      lastActive: '3 hours ago'
    },
    { 
      initials: 'EM', 
      name: 'Emma M.', 
      type: 'Pedestrian', 
      rating: '4.9', 
      location: 'Central London • Tourist Guide',
      routes: ['Covent Garden → Tower Bridge', 'Westminster → St. Paul\'s'],
      available: ['Weekend', 'Afternoon'],
      lastActive: '1 hour ago'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-slate-700 py-24">
        {/* Decorative Circles */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-accent/20 rounded-full"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent/10 rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-accent/15 rounded-full"></div>
        <div className="absolute bottom-40 right-1/3 w-24 h-24 bg-accent/20 rounded-full"></div>
        
        <div className="relative container mx-auto px-6 text-center">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-2xl text-primary-dark">👥</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Find Your Perfect
          </h1>
          <h2 className="text-5xl md:text-6xl font-bold text-accent mb-8">
            Travel Buddy
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-12">
            Connect with people and make your journeys safer, more fun, and meaningful
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-primary/60 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-accent">🛡️</span>
              </div>
              <h3 className="font-bold text-white mb-2">Enhanced Safety</h3>
              <p className="text-sm text-text-secondary">Travel with verified companions for peace of mind on every journey</p>
            </div>

            <div className="bg-primary/60 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-accent">💚</span>
              </div>
              <h3 className="font-bold text-white mb-2">Build Connections</h3>
              <p className="text-sm text-text-secondary">Meet like-minded people and create lasting friendships through shared journeys</p>
            </div>

            <div className="bg-primary/60 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-accent">👥</span>
              </div>
              <h3 className="font-bold text-white mb-2">Explore Together</h3>
              <p className="text-sm text-text-secondary">Discover new routes and hidden gems with local companions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Filters */}
      <section className="bg-white py-8">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-white border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600">🔍</span>
              <h3 className="text-xl font-bold text-primary-dark">Find Your Perfect Travel Buddy</h3>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <span className="text-gray-500">🚶</span>
                  Transport Mode
                </label>
                <select className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent text-gray-900">
                  <option>All Modes</option>
                  <option>Pedestrian</option>
                  <option>Cyclist</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <span className="text-gray-500">🏢</span>
                  Area/Borough
                </label>
                <select className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent text-gray-900">
                  <option>All Areas</option>
                  <option>Central London</option>
                  <option>East London</option>
                  <option>West London</option>
                  <option>North London</option>
                  <option>South London</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <span className="text-gray-500">⏰</span>
                  Time Preference
                </label>
                <select className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent text-gray-900">
                  <option>Any Time</option>
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                  <option>Night</option>
                </select>
              </div>

              <div>
                <button className="w-full bg-accent hover:bg-accent/90 text-primary-dark font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2">
                  🔍 Find Buddies
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available Travel Buddies */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-primary-dark">Available Travel Buddies</h2>
            <div className="text-sm text-gray-600">12 buddies found in your area</div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {buddies.map((buddy) => (
              <div key={buddy.initials} className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-primary-dark font-bold">
                      {buddy.initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-primary-dark">{buddy.name}</h4>
                      <div className="text-sm text-gray-600">{buddy.type} • ⭐ {buddy.rating}</div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">{buddy.location}</div>

                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Preferred Routes:</div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {buddy.routes.map((route, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        {route}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Available:</div>
                  <div className="flex gap-1 flex-wrap">
                    {buddy.available.map((time, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {time}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                  <span>⏰</span>
                  <span>Last active: {buddy.lastActive}</span>
                </div>

                <button className="w-full bg-primary-dark hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2">
                  � Connect
                </button>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button className="bg-accent hover:bg-accent/90 text-primary-dark font-bold py-3 px-8 rounded-lg transition-all duration-200">
              Load More Buddies
            </button>
          </div>
        </div>
      </section>

      {/* Safety Tips Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-accent to-blue-500 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl text-white">🛡️</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Travel Buddy Safety Tips</h2>
            <p className="text-xl text-white/90 mb-8">Stay safe while exploring together</p>

            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">📱</span>
                  <h3 className="text-xl font-bold text-white">Before Meeting</h3>
                </div>
                <ul className="space-y-2 text-white/90 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Always share route details with your buddy beforehand
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Meet in a public, well-lit location first
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Check their profile and reviews from other users
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Trust your instincts - if something feels off, don't go
                  </li>
                </ul>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🚶</span>
                  <h3 className="text-xl font-bold text-white">During Travel</h3>
                </div>
                <ul className="space-y-2 text-white/90 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Use reflective gear and lights during night travel
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Stay together and maintain communication
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Stick to well-known and safe routes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Keep emergency contacts handy on your phone
                  </li>
                </ul>
              </div>
            </div>

            <button className="mt-8 bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 font-bold py-3 px-8 rounded-lg transition-all duration-200">
              ⚠️ Report Any Safety Issues
            </button>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-primary-dark mb-4">Ready to Find Your Travel Buddy?</h2>
          <p className="text-xl text-gray-600 mb-8">Join our growing community of safety-conscious travelers</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-accent hover:bg-accent/90 text-primary-dark font-bold py-4 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2">
              👤 Create Your Profile
            </button>
            <button className="bg-primary-dark hover:bg-primary text-white font-bold py-4 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2">
              🗺️ Plan a Route First
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
