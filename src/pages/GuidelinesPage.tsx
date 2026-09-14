import { Link } from 'react-router-dom'

export function GuidelinesPage() {
  return (
    <div className="bg-canvas px-4 py-16">
      <div className="mx-auto max-w-[65ch]">

        {/* Page header */}
        <p className="eyebrow mb-3">Community guidelines</p>
        <h1 className="display-lg text-ink">What belongs in a review</h1>
        <p className="mt-4 text-base text-ink-muted">
          Reviews on this platform inform other workers about employment conditions. They are most
          useful when they are specific, honest, and fair — and they must meet these standards to
          remain on the platform.
        </p>

        <div className="mt-12 space-y-12">

          {/* Section: What to write */}
          <section>
            <p className="eyebrow mb-2">What to write</p>
            <h2 className="text-xl font-semibold text-ink">Share your personal experience</h2>
            <div className="mt-4 space-y-3 text-base text-ink-muted">
              <p>
                Describe your own direct experience working for or with the employer. Discuss pay
                practices, communication, visa support, management, job stability, and project
                quality — the dimensions the rating system captures.
              </p>
              <p>
                Be specific and concrete. "They processed my H-1B transfer in three weeks and kept
                me updated throughout" is more useful than "good visa support." Specifics help
                other workers calibrate their own situations.
              </p>
              <p>
                You may write about experiences you witnessed first-hand as a colleague, so long
                as you do not name or identify the individual involved.
              </p>
            </div>
          </section>

          {/* Section: What not to write */}
          <section>
            <p className="eyebrow mb-2">What not to write</p>
            <h2 className="text-xl font-semibold text-ink">Content that will be removed</h2>
            <div className="mt-4 space-y-6">

              <div className="rounded-lg border border-line bg-canvas-subtle px-5 py-4">
                <h3 className="font-semibold text-ink">Confidential company information</h3>
                <p className="mt-1.5 text-sm text-ink-muted">
                  Do not post internal documents, proprietary processes, client lists, financial
                  data, or anything marked confidential by your employer. This applies even if you
                  believe the information reflects badly on them. Use the review form to describe
                  your experience in your own words, not to distribute materials.
                </p>
              </div>

              <div className="rounded-lg border border-line bg-canvas-subtle px-5 py-4">
                <h3 className="font-semibold text-ink">Personal information about individuals</h3>
                <p className="mt-1.5 text-sm text-ink-muted">
                  Do not name, identify, or post personal information about individual colleagues,
                  managers, or recruiters — even if your experience with them was poor. You may
                  describe a manager's behaviour without naming them ("my project manager at the
                  time"). Our focus is employer practices, not individuals.
                </p>
              </div>

              <div className="rounded-lg border border-line bg-canvas-subtle px-5 py-4">
                <h3 className="font-semibold text-ink">Threats and harassment</h3>
                <p className="mt-1.5 text-sm text-ink-muted">
                  Reviews that threaten, intimidate, or harass any person or organisation are
                  removed immediately and may be referred to law enforcement. Criticism of
                  employer practices — including legal criticism expressed forcefully — is
                  welcome; threats are not.
                </p>
              </div>

              <div className="rounded-lg border border-line bg-canvas-subtle px-5 py-4">
                <h3 className="font-semibold text-ink">Unsupported allegations</h3>
                <p className="mt-1.5 text-sm text-ink-muted">
                  State what happened to you, not what you believe to be true about the employer
                  in general unless it is clearly presented as your opinion. Allegations of
                  illegal conduct should be phrased as your experience or observation, not as
                  established fact: "I was told my hours would not count toward overtime" rather
                  than "this employer commits wage theft."
                </p>
              </div>

            </div>
          </section>

          {/* Section: Anonymity */}
          <section>
            <p className="eyebrow mb-2">Privacy</p>
            <h2 className="text-xl font-semibold text-ink">Reviews are anonymous by default</h2>
            <div className="mt-4 space-y-3 text-base text-ink-muted">
              <p>
                Your identity is never shown to employers or the public unless you choose to
                share it. When you write a review, every privacy flag — your name, job title,
                employment duration, project or client, location, and LinkedIn profile — starts
                off. Anonymity is where you begin; disclosure is a deliberate opt-in on each
                review.
              </p>
              <p>
                Your email address is never made public under any circumstances. Your display
                name is stored on your account but is shown on a review only if you explicitly
                turn on the name toggle for that review.
              </p>
            </div>
          </section>

          {/* Section: One review per employer */}
          <section>
            <p className="eyebrow mb-2">Fairness</p>
            <h2 className="text-xl font-semibold text-ink">One review per employer</h2>
            <div className="mt-4 space-y-3 text-base text-ink-muted">
              <p>
                You may write one review per employer. This keeps the rating system honest —
                flooding an employer's page with multiple submissions from the same person would
                distort the aggregate scores that others rely on.
              </p>
              <p>
                If your circumstances change — you were rehired, or your view has evolved — you
                can edit your existing review at any time from your account page. There is no
                need to create a second account.
              </p>
            </div>
          </section>

          {/* Section: Reporting and moderation */}
          <section>
            <p className="eyebrow mb-2">Moderation</p>
            <h2 className="text-xl font-semibold text-ink">How reporting and moderation work</h2>
            <div className="mt-4 space-y-3 text-base text-ink-muted">
              <p>
                Any signed-in user can report a review or employer listing that they believe
                violates these guidelines. Reporting flags the content for human review — nothing
                is deleted automatically. A moderator reads every report and decides whether the
                content stays, is edited, or is removed.
              </p>
              <p>
                Moderators look at the content against these guidelines, the context of the
                report, and the history of the account that posted it. If a review is removed,
                the author receives a notice explaining why. If you believe a removal was in
                error, contact us.
              </p>
              <p>
                Repeated violations — including repeated false reports — may result in account
                suspension. We do not disclose moderation decisions about third parties.
              </p>
            </div>
          </section>

        </div>

        {/* Footer navigation */}
        <div className="mt-16 border-t border-line pt-8">
          <p className="text-sm text-ink-muted">
            Questions?{' '}
            <Link to="/sign-in" className="text-brand underline-offset-4 hover:underline">
              Sign in
            </Link>{' '}
            to contact moderation, or{' '}
            <Link to="/" className="text-brand underline-offset-4 hover:underline">
              return home
            </Link>
            .
          </p>
        </div>

      </div>
    </div>
  )
}
