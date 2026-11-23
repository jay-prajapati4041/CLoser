import { useState } from 'react'

// AuthForm handles both account creation and sign-in, then reports the user to App.
export default function AuthForm({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegister = mode === 'register'

  function changeMode(nextMode) {
    setMode(nextMode)
    setErrorMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const credentials = {
      email: formData.get('email').trim(),
      password: formData.get('password'),
    }
    if (isRegister) credentials.name = formData.get('name').trim()

    setErrorMessage('')
    setIsSubmitting(true)
    try {
      await onAuthenticated(mode, credentials)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="auth-heading">
        <span className="section-kicker">{isRegister ? 'A good place to begin' : 'Welcome back'}</span>
        <h2>{isRegister ? 'Make room for what’s next.' : 'Let’s pick up where you left off.'}</h2>
        <p>{isRegister ? 'Create your private workspace. Your leads belong to you.' : 'Sign in to your private workspace.'}</p>
      </div>

      <div className="auth-tabs" role="tablist" aria-label="Account options">
        <button
          className={`auth-tab ${isRegister ? '' : 'active'}`}
          type="button"
          role="tab"
          aria-selected={!isRegister}
          onClick={() => changeMode('login')}
        >
          Sign in
        </button>
        <button
          className={`auth-tab ${isRegister ? 'active' : ''}`}
          type="button"
          role="tab"
          aria-selected={isRegister}
          onClick={() => changeMode('register')}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {isRegister && (
          <label className="field" htmlFor="name">
            <span>Your name</span>
            <input id="name" name="name" type="text" autoComplete="name" maxLength="80" placeholder="How should we call you?" required />
          </label>
        )}
        <label className="field" htmlFor="email">
          <span>Work email</span>
          <input id="email" name="email" type="email" autoComplete="email" maxLength="254" placeholder="you@company.com" required />
        </label>
        <label className="field" htmlFor="password">
          <span>Password</span>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength="8"
            maxLength="72"
            placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
            required
          />
          <span className="field-note">{isRegister ? 'Use at least 8 characters.' : 'At least 8 characters.'}</span>
        </label>

        <p className={`form-message ${errorMessage ? 'visible' : ''}`} role="alert">{errorMessage}</p>
        <button className="submit-button" type="submit" disabled={isSubmitting}>
          <span>
            {isSubmitting
              ? (isRegister ? 'Creating your account…' : 'Signing you in…')
              : (isRegister ? 'Create my account' : 'Sign in to Closer')}
          </span>
          <span className="button-arrow" aria-hidden="true">↗</span>
        </button>
        <p className="form-assurance"><span className="assurance-check" aria-hidden="true">✓</span> Your customer information stays yours.</p>
      </form>
    </>
  )
}
