import { create } from 'zustand'

type View = 'home' | 'detail' | 'chat' | 'debate' | 'quiz' | 'login' | 'register' | 'subscription' | 'host' | 'admin'

interface User {
  id: string
  email: string
  name: string
  plan: string
  avatar: string
}

interface AppState {
  currentView: View
  selectedPhilosopherId: string | null
  selectedPhilosopher2Id: string | null
  categoryFilter: string | null
  eraFilter: string | null
  // Auth
  user: User | null
  isAuthenticated: boolean
  // Actions
  setView: (view: View) => void
  selectPhilosopher: (id: string) => void
  selectPhilosopher2: (id: string) => void
  setCategoryFilter: (cat: string | null) => void
  setEraFilter: (era: string | null) => void
  goHome: () => void
  setUser: (user: User | null) => void
  login: (user: User) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  selectedPhilosopherId: null,
  selectedPhilosopher2Id: null,
  categoryFilter: null,
  eraFilter: null,
  user: null,
  isAuthenticated: false,

  setView: (view) => set({ currentView: view }),
  selectPhilosopher: (id) => set({ selectedPhilosopherId: id, currentView: 'detail' }),
  selectPhilosopher2: (id) => set({ selectedPhilosopher2Id: id }),
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  setEraFilter: (era) => set({ eraFilter: era }),
  goHome: () => set({ currentView: 'home', selectedPhilosopherId: null, selectedPhilosopher2Id: null, categoryFilter: null, eraFilter: null }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
