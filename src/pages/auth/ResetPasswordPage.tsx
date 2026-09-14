import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError } from '@/components/ui/field'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { resetRequestSchema, fieldErrors } from '@/lib/validation'
import { toAuthMessage } from '@/lib/errors'

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const result = resetRequestSchema.safeParse({ email })
    if (!result.success) {
      const errs = fieldErrors(result.error)
      setErrors(errs)
      emailRef.current?.focus()
      return
    }

    setErrors({})
    setIsPending(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) {
        // Log internally but show the same neutral message regardless — do
        // not leak whether an account exists for this email.
        console.error('Reset password error:', error.message)
      }

      // Always show the neutral confirmation — never reveal account existence.
      setSubmitted(true)
    } catch (err) {
      setFormError(toAuthMessage(err))
    } finally {
      setIsPending(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-sunken px-4 py-16">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="py-6 text-center">
                <h1 className="text-xl font-semibold text-ink">Check your email</h1>
                <p className="mt-3 text-sm text-ink-muted">
                  If an account exists for{' '}
                  <span className="font-medium text-ink">{email}</span>, we sent a password
                  reset link. Check your inbox — the link expires in one hour.
                </p>
                <p className="mt-4 text-sm text-ink-muted">
                  <Link to="/sign-in" className="text-brand underline-offset-4 hover:underline">
                    Back to sign in
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
          <h1 className="display-lg text-ink">Reset password</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Enter your email and we will send you a reset link.
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
                <label className="text-sm font-medium text-ink" htmlFor="reset-email">
                  Email
                </label>
                <Input
                  ref={emailRef}
                  id="reset-email"
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

              <Button type="submit" loading={isPending} className="w-full">
                Send reset link
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-ink-muted">
              <Link to="/sign-in" className="text-brand underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
