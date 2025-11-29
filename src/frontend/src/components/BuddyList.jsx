'use client';

import { useState } from 'react';
import BuddyCard from './BuddyCard';

const mockBuddies = [
  {
    id: 1,
    initials: 'AM',
    name: 'Alex M.',
    type: 'Cyclist',
    rating: 4.9,
    location: 'Central London',
    description: 'Regular Commuter',
    routes: [
      'Kings Cross → London Bridge',
      'Camden → City of London'
    ],
    availability: ['Mon-Fri', 'Morning', 'Evening'],
    lastActive: '2 hours ago',
    color: 'bg-teal-400'
  },
  {
    id: 2,
    initials: 'SJ',
    name: 'Sarah J.',
    type: 'Pedestrian',
    rating: 4.7,
    location: 'East London',
    description: 'Student',
    routes: [
      'Victoria Park → Mile End',
      'Canary Wharf → Greenwich'
    ],
    availability: ['Tue-Thu', 'Afternoon', 'Weekend'],
    lastActive: '1 hour ago',
    color: 'bg-cyan-400'
  },
  {
    id: 3,
    initials: 'MR',
    name: 'Mike R.',
    type: 'Cyclist',
    rating: 4.8,
    location: 'West London',
    description: 'Professional',
    routes: [
      'Hammersmith → Westminster',
      'Kensington → Paddington'
    ],
    availability: ['Daily', 'Morning'],
    lastActive: '30 minutes ago',
    color: 'bg-teal-500'
  },
  {
    id: 4,
    initials: 'LT',
    name: 'Lisa T.',
    type: 'Pedestrian',
    rating: 5.0,
    location: 'South London',
    description: 'Fitness Enthusiast',
    routes: [
      'Clapham → Waterloo',
      'Brixton → London Bridge'
    ],
    availability: ['Mon-Fri', 'Evening'],
    lastActive: '45 minutes ago',
    color: 'bg-cyan-300'
  },
  {
    id: 5,
    initials: 'JK',
    name: 'James K.',
    type: 'Cyclist',
    rating: 4.6,
    location: 'North London',
    description: 'Night Shift Worker',
    routes: [
      'Islington → King\'s Cross',
      'Highbury → Arsenal'
    ],
    availability: ['Mon-Fri', 'Night'],
    lastActive: '3 hours ago',
    color: 'bg-teal-600'
  },
  {
    id: 6,
    initials: 'EM',
    name: 'Emma M.',
    type: 'Pedestrian',
    rating: 4.9,
    location: 'Central London',
    description: 'Tourist Guide',
    routes: [
      'Covent Garden → Tower Bridge',
      'Westminster → St. Paul\'s'
    ],
    availability: ['Weekend', 'Afternoon'],
    lastActive: '1 hour ago',
    color: 'bg-cyan-500'
  }
];

export default function BuddyList() {
  const [buddies] = useState(mockBuddies);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Available Travel Buddies</h2>
        <p className="text-gray-600">{buddies.length} buddies found in your area</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buddies.map((buddy) => (
          <BuddyCard key={buddy.id} buddy={buddy} />
        ))}
      </div>
    </div>
  );
}