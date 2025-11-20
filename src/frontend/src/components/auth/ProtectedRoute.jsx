// 'use client'

export default function ProtectedRoute({ children }) {
  // ✅ No login check, no redirect — always show the page
  return children;
}