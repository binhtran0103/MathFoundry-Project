import { useState } from 'react'

// Renders account details or the sign-in and registration form.
export default function AccountForm({ profile, busy, error, clearError, authenticate, signOut }) {
  const [register, setRegister] = useState(false)

  return <>
    <h2 id="modal-title">{profile ? 'Your account' : register ? 'Create an account' : 'Sign in'}</h2>
    {error && <div className="error" role="alert">{error}</div>}
    {profile ? <>
      <p className="modal-intro">{profile.name} · {profile.email}</p>
      <button className="secondary full" disabled={busy} onClick={signOut}>Sign out</button>
    </> : <>
      <form key={register} onSubmit={event => {
        event.preventDefault()
        authenticate(event.currentTarget, register)
      }}>
        {register && <label>Your name<input name="name" autoComplete="name" required maxLength={40}/></label>}
        <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
        <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={12} maxLength={128}/></label>
        {register && <p className="modal-intro">Use at least 12 characters.</p>}
        <button className="primary full" disabled={busy} type="submit">{register ? 'Create account' : 'Sign in'}</button>
      </form>
      <button className="text-button full" disabled={busy} onClick={() => {
        clearError()
        setRegister(current => !current)
      }}>{register ? 'Sign in to an existing account' : 'Create an account'}</button>
    </>}
  </>
}
