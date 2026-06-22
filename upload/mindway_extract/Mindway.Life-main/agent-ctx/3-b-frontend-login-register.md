# Task 3-b: Frontend Developer - Login/Register

## Work Record

### Files Created
1. `/home/z/my-project/src/components/auth-view.tsx` - Full-screen auth view with login/register tabs
2. `/home/z/my-project/src/components/user-menu.tsx` - Compact header user menu component

### Files Modified
1. `/home/z/my-project/src/app/page.tsx` - Integrated auth views and UserMenu

### Key Decisions
- Used shadcn/ui Tabs for login/register toggle (cleaner than custom toggle)
- Auth view is a full-screen view (same pattern as chat/debate/quiz) with its own header containing back button and theme toggle
- UserMenu replaces the old Crown/订阅 button in the header, providing unified auth access point
- Login and register share the same AuthView component with tab switching; form state resets on tab change
- Password visibility toggles (eye/eye-off) for better UX
- Philosophical quotes rotate based on time for decorative effect
- Logout attempts server-side cookie clear but gracefully falls back to local state only

### API Integration
- POST /api/auth/login - { email, password } → { user, token }
- POST /api/auth/register - { email, password, name } → { user, token }
- GET /api/auth/me - checks auth status on mount, auto-redirects if logged in

### Store Integration
- login(user) - sets user and isAuthenticated
- logout() - clears user state
- setView('login'/'register'/'home'/'subscription') - navigation

### Styling
- All colors use CSS custom properties (var(--app-*)) for dark mode compatibility
- Warm vintage aesthetic matching the rest of the app
- framer-motion for entrance animations and error message transitions
- Responsive: text labels hidden on mobile, visible on sm+
