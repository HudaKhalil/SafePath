// 'use client'

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { authService } from '../../lib/services';

// export default function ProtectedRoute({ children }) {
//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState(true);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         if (!authService.isLoggedIn()) {
//           router.push('/auth/login');
//           return;
//         }

//         // Verify token by making a profile request
//         await authService.getProfile();
//         setIsAuthenticated(true);
//       } catch (error) {
//         // Only log unexpected errors, not normal "unauthorized" responses
//         if (error.message !== 'Access token required' && !error.message?.includes('401')) {
//           console.error('Auth check failed:', error)
//         }
//         authService.logout()
//         router.push('/auth/login')
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     checkAuth();
//   }, [router]);

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-slate-900 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
//           <p className="text-white mt-4">Checking authentication...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return null; // Router will handle redirect
//   }

//   return children;
// }

'use client'

export default function ProtectedRoute({ children }) {
  // ✅ No login check, no redirect — always show the page
  return children;
}