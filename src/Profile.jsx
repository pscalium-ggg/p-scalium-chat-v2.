import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { colors } from './colors'

export default function Profile({ session, onBack }) {
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', session.user.id)
      .single()

    if (!error && data) {
      setDisplayName(data.display_name || '')
      setAvatarUrl(data.avatar_url || '')
    }
    setLoading(false)
  }

  const updateDisplayName = async () => {
    if (!displayName.trim()) {
      alert('Le nom ne peut pas être vide')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', session.user.id)

    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      alert('Nom mis à jour !')
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `avatars/${session.user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file)

    if (uploadError) {
      alert('Erreur upload : ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', session.user.id)

    if (updateError) {
      alert('Erreur : ' + updateError.message)
    } else {
      setAvatarUrl(urlData.publicUrl)
    }

    setUploading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.background }}>
        <div className="spinner" style={{ width: 28, height: 28, border: `3px solid ${colors.blueLight}`, borderTopColor: colors.blue, borderRadius: '50%' }} />
      </div>
    )
  }

  return (
    <div className="screen-enter" style={{ minHeight: '100vh', background: colors.background }}>
      <div style={{ background: colors.blue, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, color: colors.white, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', color: colors.white, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Mon profil</h2>
      </div>

      <div className="modal-content-enter" style={{ maxWidth: 500, margin: '0 auto', padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${colors.yellow}`, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: colors.blueLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: 48
              }}
            >
              👤
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <input
              type="file"
              id="avatarInput"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => document.getElementById('avatarInput').click()}
              disabled={uploading}
              style={{
                background: colors.yellowLight,
                color: colors.blueDark,
                border: `1.5px solid ${colors.yellow}`,
                borderRadius: 22,
                padding: '9px 18px',
                cursor: uploading ? 'default' : 'pointer',
                fontWeight: 700,
                fontSize: 13.5
              }}
            >
              {uploading ? 'Envoi...' : 'Changer la photo'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, color: colors.textLight, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Nom d'affichage</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ flex: 1, padding: 11, borderRadius: 10, border: `1.5px solid ${colors.border}`, fontSize: 15 }}
            />
            <button
              onClick={updateDisplayName}
              style={{ background: colors.blue, color: colors.white, border: 'none', borderRadius: 10, padding: '0 18px', cursor: 'pointer', fontWeight: 600 }}
            >
              Enregistrer
            </button>
          </div>
        </div>

        <p style={{ color: colors.textLight, fontSize: 13, textAlign: 'center' }}>
          Email : {session.user.email}
        </p>
      </div>
    </div>
  )
}
