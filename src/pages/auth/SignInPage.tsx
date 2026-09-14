import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError } from '@/components/ui/field'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { signInSchema, fieldErrors } from '@/lib/validation'
import { toAuthMessage } from '@/lib/errors'

export function SignInPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Redirect if already signed in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const result = signInSchema.safeParse({ email, password })
    if (!result.success) {
      const errs = fieldErrors(result.error)
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      if (firstKey === 'email') emailRef.current?.focus()
      else if (firstKey === 'password') passwordRef.current?.focus()
      return
    }

    setErrors({})
    setIsPending(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      })

      if (error) {
        setFormError(toAuthMessage(error))
        return
      }

      const destination =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
      navigate(destination, { replace: true })
    } catch (err) {
      setFormError(toAuthMessage(err))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-sunken px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="display-lg text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-ink-muted">
            New here?{' '}
            <Link to="/sign-up" className="text-brand underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader />
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {formError && (
                <p role="alert" className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical">
                  {formError}
                </p>
              )}

              <Field>
                <label className="text-sm font-medium text-ink" htmlFor="signin-email">
                  Email
                </label>
                <Input
                  ref={emailRef}
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors['email'])}
                  placeholder="you@example.com"
                  required
                />
                <FieldError>{errors['email']}</FieldError>
              </Field>

              <Field>
                <label className="text-sm font-medium text-ink" htmlFor="signin-password">
                  Password
                </label>
                <Input
                  ref={passwordRef}
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors['password'])}
                  placeholder="••••••••"
                  required
                />
                <FieldError>{errors['password']}</FieldError>
              </Field>

              <div className="flex items-center justify-between">
                <Link
                  to="/reset-password"
                  className="text-sm text-ink-muted underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" loading={isPending} className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
