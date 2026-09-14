import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldError } from '@/components/ui/field'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { signUpSchema, fieldErrors } from '@/lib/validation'
import { toAuthMessage } from '@/lib/errors'

export function SignUpPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)
  const displayNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const result = signUpSchema.safeParse({ email, password, confirmPassword, displayName })
    if (!result.success) {
      const errs = fieldErrors(result.error)
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      if (firstKey === 'email') emailRef.current?.focus()
      else if (firstKey === 'password') passwordRef.current?.focus()
      else if (firstKey === 'confirmPassword') confirmPasswordRef.current?.focus()
      else if (firstKey === 'displayName') displayNameRef.current?.focus()
      return
    }

    setErrors({})
    setIsPending(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          data: { display_name: result.data.displayName },
          emailRedirectTo: `${window.location.origin}/sign-in`,
        },
      })

      if (error) {
        setFormError(toAuthMessage(error))
        return
      }

      if (data.session === null) {
        setCheckEmail(true)
        return
      }

      navigate('/', { replace: true })
    } catch (err) {
      setFormError(toAuthMessage(err))
    } finally {
      setIsPending(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-sunken px-4 py-16">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle className="size-10 text-positive" aria-hidden="true" />
                <h1 className="mt-4 text-xl font-semibold text-ink">Check your email</h1>
                <p className="mt-2 text-sm text-ink-muted">
                  We sent a confirmation link to{' '}
                  <span className="font-medium text-ink">{email}</span>. Open it to activate
                  your account. The link expires in 24 hours.
                </p>
                <p className="mt-4 text-sm text-ink-muted">
                  Already confirmed?{' '}
                  <Link to="/sign-in" className="text-brand underline-offset-4 hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-sunken px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="display-lg text-ink">Create an account</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Already have one?{' '}
            <Link to="/sign-in" className="text-brand underline-offset-4 hover:underline">
              Sign in
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
                <label className="text-sm font-medium text-ink" htmlFor="signup-displayname">
                  Display name
                </label>
                <Input
                  ref={displayNameRef}
                  id="signup-displayname"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  aria-invalid={Boolean(errors['displayName'])}
                  placeholder="e.g. Priya S."
                  maxLength={80}
                  required
                />
                <FieldDescription>
                  Shown only if you explicitly choose to show your name on a review — reviews
                  are anonymous by default. Your email is never made public.
                </FieldDescription>
                <FieldError>{errors['displayName']}</FieldError>
              </Field>

              <Field>
                <label className="text-sm font-medium text-ink" htmlFor="signup-email">
                  Email
                </label>
                <Input
                  ref={emailRef}
                  id="signup-email"
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
                <label className="text-sm font-medium text-ink" htmlFor="signup-password">
                  Password
                </label>
                <Input
                  ref={passwordRef}
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors['password'])}
                  placeholder="••••••••"
                  required
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
                <FieldError>{errors['password']}</FieldError>
              </Field>

              <Field>
                <label className="text-sm font-medium text-ink" htmlFor="signup-confirm">
                  Confirm password
                </label>
                <Input
                  ref={confirmPasswordRef}
                  id="signup-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={Boolean(errors['confirmPassword'])}
                  placeholder="••••••••"
                  required
                />
                <FieldError>{errors['confirmPassword']}</FieldError>
              </Field>

              <Button type="submit" loading={isPending} className="w-full">
                Create account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
