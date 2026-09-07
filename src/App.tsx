import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Chat from './Chat'
import ConversationList from './ConversationList'
import Profile from './Profile'
import Settings from './Settings'
import { colors } from './colors'
import './App.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.background }}>
        <p style={{ color: colors.textLight }}>Chargement...</p>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  if (showProfile) {
    return <Profile session={session} onBack={() => setShowProfile(false)} />
  }

  if (showSettings) {
    return (
      <Settings
        session={session}
        onBack={() => setShowSettings(false)}
        onLogout={handleLogout}
        onOpenProfile={() => {
          setShowSettings(false)
          setShowProfile(true)
        }}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      {!activeConversationId && (
        <div
          style={{
            background: colors.blueDark,
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: colors.white,
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 15 }}>P-Scalium Chat</span>
          <button
            onClick={() => setShowSettings(true)}
            style={{ background: 'none', border: 'none', color: colors.white, cursor: 'pointer', fontSize: 22 }}
            aria-label="Paramètres"
          >
            ⚙️
          </button>
        </div>
      )}

      {activeConversationId ? (
        <Chat
          session={session}
          conversationId={activeConversationId}
          onBack={() => setActiveConversationId(null)}
        />
      ) : (
        <ConversationList
          session={session}
          onSelectConversation={(id: string) => setActiveConversationId(id)}
        />
      )}
    </div>
  )
}

export default App
