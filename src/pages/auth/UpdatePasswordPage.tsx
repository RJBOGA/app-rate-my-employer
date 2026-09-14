import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError } from '@/components/ui/field'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { updatePasswordSchema, fieldErrors } from '@/lib/validation'
import { toAuthMessage } from '@/lib/errors'

export function UpdatePasswordPage() {
  const { session, initializing } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  // Wait until the auth module has had a chance to parse the URL fragment and
  // establish the recovery session before deciding whether the link is valid.
  const isReady = !initializing

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const result = updatePasswordSchema.safeParse({ password, confirmPassword })
    if (!result.success) {
      const errs = fieldErrors(result.error)
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      if (firstKey === 'password') passwordRef.current?.focus()
      else if (firstKey === 'confirmPassword') confirmPasswordRef.current?.focus()
      return
    }

    setErrors({})
    setIsPending(true)

    try {
      const { error } = await supabase.auth.updateUser({ password: result.data.password })

      if (error) {
        setFormError(toAuthMessage(error))
        return
      }

      navigate('/account', { replace: true })
    } catch (err) {
      setFormError(toAuthMessage(err))
    } finally {
      setIsPending(false)
    }
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-sunken px-4">
        <p className="text-sm text-ink-muted">Verifying reset link…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-sunken px-4 py-16">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="py-6 text-center">
                <h1 className="text-xl font-semibold text-ink">
                  This reset link is invalid or has expired
                </h1>
                <p className="mt-3 text-sm text-ink-muted">
                  Password reset links expire after one hour and can only be used once.
                  Request a new one below.
                </p>
                <Link
                  to="/reset-password"
                  className="mt-4 inline-block text-sm text-brand underline-offset-4 hover:underline"
                >
                  Request a new reset link
                </Link>
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
          <h1 className="display-lg text-ink">Choose a new password</h1>
          <p className="mt-2 text-sm text-ink-muted">Must be at least 8 characters.</p>
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
                <label className="text-sm font-medium text-ink" htmlFor="update-password">
                  New password
                </label>
                <Input
                  ref={passwordRef}
                  id="update-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors['password'])}
                  placeholder="••••••••"
                  required
                />
                <FieldError>{errors['password']}</FieldError>
              </Field>

              <Field>
                <label className="text-sm font-medium text-ink" htmlFor="update-confirm">
                  Confirm new password
                </label>
                <Input
                  ref={confirmPasswordRef}
                  id="update-confirm"
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
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
