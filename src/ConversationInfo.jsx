import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { colors } from './colors'

export default function ConversationInfo({ session, conversationId, conversationType, onBack, onLeft }) {
  const [groupName, setGroupName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchInfo()
  }, [])

  const fetchInfo = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: convData } = await supabase
      .from('conversations')
      .select('name')
      .eq('id', conversationId)
      .single()

    if (convData) {
      setGroupName(convData.name || '')
    }

    const { data: participantsData, error } = await supabase
      .from('conversation_participants')
      .select('user_id, is_admin')
      .eq('conversation_id', conversationId)

    if (error || !participantsData) {
      setLoading(false)
      return
    }

    const myEntry = participantsData.find((p) => p.user_id === user.id)
    setIsAdmin(myEntry ? myEntry.is_admin : false)

    const userIds = participantsData.map((p) => p.user_id)

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds)

    const merged = (profilesData || []).map((p) => {
      const partInfo = participantsData.find((pp) => pp.user_id === p.id)
      return { ...p, is_admin: partInfo ? partInfo.is_admin : false }
    })

    setParticipants(merged)
    setLoading(false)
  }

  const updateGroupName = async () => {
    if (!groupName.trim()) {
      alert('Le nom ne peut pas être vide')
      return
    }

    const { error } = await supabase
      .from('conversations')
      .update({ name: groupName.trim() })
      .eq('id', conversationId)

    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      setEditingName(false)
    }
  }

  const removeParticipant = async (userId, username) => {
    const confirmed = window.confirm(`Retirer ${username} du groupe ?`)
    if (!confirmed) return

    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)

    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      fetchInfo()
    }
  }

  const toggleAdmin = async (userId, username, currentlyAdmin) => {
    const action = currentlyAdmin ? 'retirer les droits admin de' : 'nommer'
    const confirmed = window.confirm(`Voulez-vous ${action} ${username} ${currentlyAdmin ? '' : 'comme admin'} ?`)
    if (!confirmed) return

    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_admin: !currentlyAdmin })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)

    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      fetchInfo()
    }
  }

  const leaveGroup = async () => {
    const confirmed = window.confirm('Voulez-vous quitter ce groupe ?')
    if (!confirmed) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      onLeft()
    }
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
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Infos</h2>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 22 }}>
        {conversationType === 'group' && (
          <div className="modal-content-enter" style={{ marginBottom: 26, background: colors.white, borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{ flex: '1 1 150px', padding: 9, borderRadius: 10, border: `1.5px solid ${colors.border}`, fontSize: 15 }}
                />
                <button onClick={updateGroupName} style={{ background: colors.blue, color: colors.white, border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer', fontWeight: 600 }}>
                  ✓
                </button>
                <button onClick={() => setEditingName(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: colors.text, fontSize: 17, fontWeight: 700 }}>{groupName}</h3>
                {isAdmin && (
                  <button onClick={() => setEditingName(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 17 }}>
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <h4 style={{ color: colors.textLight, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 10 }}>
          Participants ({participants.length})
        </h4>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {participants.map((p, index) => (
            <li
              key={p.id}
              className="list-item-enter"
              style={{
                animationDelay: `${index * 0.04}s`,
                padding: 13,
                background: colors.white,
                borderRadius: 12,
                marginBottom: 7,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 11, color: colors.text, minWidth: 0 }}>
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="avatar" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: colors.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                    👤
                  </div>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, fontSize: 15 }}>
                  {p.display_name || p.username}{p.id === session.user.id ? ' (Toi)' : ''}
                  {p.is_admin && <span style={{ color: colors.blue, fontSize: 11.5, fontWeight: 700 }}> · Admin</span>}
                </span>
              </span>
              {conversationType === 'group' && isAdmin && p.id !== session.user.id && (
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleAdmin(p.id, p.display_name || p.username, p.is_admin)}
                    style={{ border: 'none', background: 'none', color: colors.blue, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  >
                    {p.is_admin ? 'Retirer admin' : 'Rendre admin'}
                  </button>
                  <button
                    onClick={() => removeParticipant(p.id, p.display_name || p.username)}
                    style={{ border: 'none', background: 'none', color: colors.danger, cursor: 'pointer' }}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {conversationType === 'group' && (
          <button
            onClick={leaveGroup}
            style={{
              width: '100%',
              padding: 13,
              marginTop: 22,
              background: '#FEE2E2',
              color: colors.danger,
              border: `1.5px solid ${colors.danger}`,
              borderRadius: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14.5
            }}
          >
            Quitter le groupe
          </button>
        )}
      </div>
    </div>
  )
        }
