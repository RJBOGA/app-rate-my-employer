import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/lib/database.types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: ProfileRow | null
  isStaff: boolean
  isAdmin: boolean
  isSuspended: boolean
  /** True only while the very first session lookup is in flight. */
  initializing: boolean
  profileLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
      })
      .finally(() => {
        if (active) setInitializing(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)

      // Identity changed — anything cached under the old identity is
      // no longer valid, including the caller's own reviews and roles.
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        queryClient.clear()
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [queryClient])

  const userId = session?.user.id ?? null

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // Roles come from the database, never from client state. A user who
  // flips a local flag still fails every admin RPC's require_admin().
  const rolesQuery = useQuery({
    queryKey: ['roles', userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<{ isStaff: boolean; isAdmin: boolean }> => {
      const [staffResult, adminResult] = await Promise.all([
        supabase.rpc('is_staff', {}),
        supabase.rpc('is_admin', {}),
      ])
      if (staffResult.error) throw staffResult.error
      if (adminResult.error) throw adminResult.error
      return {
        isStaff: Boolean(staffResult.data),
        isAdmin: Boolean(adminResult.data),
      }
    },
  })

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    queryClient.clear()
  }, [queryClient])

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
  }, [queryClient, userId])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: profileQuery.data ?? null,
      isStaff: rolesQuery.data?.isStaff ?? false,
      isAdmin: rolesQuery.data?.isAdmin ?? false,
      isSuspended: profileQuery.data?.is_suspended ?? false,
      initializing,
      profileLoading: profileQuery.isLoading,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profileQuery.data,
      profileQuery.isLoading,
      rolesQuery.data,
      initializing,
      signOut,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
