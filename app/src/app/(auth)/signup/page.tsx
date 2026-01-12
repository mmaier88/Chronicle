import { redirect } from 'next/navigation'

// Signup is now handled by the login page
// This redirect ensures old links and bookmarks still work
export default function SignupPage() {
  redirect('/login')
}
