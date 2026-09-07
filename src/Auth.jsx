import { useState } from 'react'
import { supabase } from './supabaseClient'
import { colors } from './colors'

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const cleanUsername = username.trim()
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username: cleanUsername, display_name: cleanUsername }
        }
      })
      if (error) {
        setMessage('Erreur : ' + error.message)
      } else {
        setMessage('Inscription réussie ! Vérifie ton email pour confirmer ton compte.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      if (error) {
        setMessage('Erreur : ' + error.message)
      }
    }

    setLoading(false)
  }

  return (
    <div
      className="screen-enter"
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${colors.blueLight} 0%, ${colors.yellowLight} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        className="modal-content-enter"
        style={{
          background: colors.white,
          borderRadius: 20,
          padding: 36,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 20px 40px rgba(30, 64, 175, 0.15)'
        }}
      >
        <h1 style={{ color: colors.blueDark, textAlign: 'center', marginBottom: 4, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
          P-Scalium Chat
        </h1>
        <h2 style={{ color: colors.textLight, textAlign: 'center', fontWeight: 500, fontSize: 15, marginTop: 4, marginBottom: 0 }}>
          {isSignUp ? 'Créer un compte' : 'Se connecter'}
        </h2>

        <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
          {isSignUp && (
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 15,
              background: loading ? colors.textLight : colors.blue,
              color: colors.white,
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              letterSpacing: 0.2,
              boxShadow: loading ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.35)'
            }}
          >
            {loading ? 'Chargement...' : isSignUp ? "S'inscrire" : 'Se connecter'}
          </button>
        </form>

        {message && (
          <p
            className="message-enter"
            style={{ marginTop: 18, textAlign: 'center', color: colors.blueDark, fontSize: 13.5, lineHeight: 1.5 }}
          >
            {message}
          </p>
        )}

        <p style={{ marginTop: 26, textAlign: 'center', fontSize: 14, color: colors.textLight }}>
          {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.blue,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              padding: 0
            }}
          >
            {isSignUp ? 'Se connecter' : "S'inscrire"}
          </button>
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: 13,
  borderRadius: 12,
  border: '1.5px solid #E5E7EB',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  color: '#1F2937'
            }
