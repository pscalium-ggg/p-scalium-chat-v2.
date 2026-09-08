import { useState } from 'react'
import { supabase } from './supabaseClient'
import { colors } from './colors'

export default function CreateGroup({ session, contacts, onGroupCreated, onCancel }) {
  const [groupName, setGroupName] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(false)

  const toggleContact = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Donne un nom au groupe')
      return
    }
    if (selectedIds.length < 2) {
      alert('Sélectionne au moins 2 personnes')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'group', name: groupName.trim(), created_by: user.id })
      .select()
      .single()

    if (convError) {
      alert('Erreur création groupe : ' + convError.message)
      setLoading(false)
      return
    }

    const participantsToInsert = [
      { conversation_id: newConv.id, user_id: user.id },
      ...selectedIds.map((id) => ({ conversation_id: newConv.id, user_id: id }))
    ]

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participantsToInsert)

    if (partError) {
      alert('Erreur ajout participants : ' + partError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onGroupCreated(newConv.id)
  }

  return (
    <div className="page-slide" style={{ minHeight: '100vh', background: colors.background }}>
      <div style={{ background: colors.blue, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, color: colors.white, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>
        <button onClick={onCancel} style={{ border: 'none', background: 'none', color: colors.white, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Nouveau groupe</h2>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 22 }}>
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Nom du groupe"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{ width: '100%', padding: 13, borderRadius: 12, border: `1.5px solid ${colors.border}`, boxSizing: 'border-box', fontSize: 15.5 }}
          />
        </div>

        <p style={{ color: colors.textLight, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 10 }}>
          Sélectionne les participants
        </p>

        {contacts.length === 0 ? (
          <p style={{ color: colors.textLight, textAlign: 'center', fontSize: 14.5 }}>
            Aucun contact disponible. Démarre d'abord une conversation avec quelqu'un.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {contacts.map((contact, index) => (
              <li
                key={contact.id}
                className="list-item-enter"
                onClick={() => toggleContact(contact.id)}
                style={{
                  animationDelay: `${index * 0.04}s`,
                  padding: 13,
                  borderRadius: 12,
                  marginBottom: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  background: selectedIds.includes(contact.id) ? colors.yellowLight : colors.white,
                  border: selectedIds.includes(contact.id) ? `1.5px solid ${colors.yellow}` : '1.5px solid transparent',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'background 0.15s ease, border-color 0.15s ease'
                }}
              >
                <input type="checkbox" checked={selectedIds.includes(contact.id)} readOnly style={{ width: 18, height: 18 }} />
                <span style={{ color: colors.text, fontWeight: 500, fontSize: 15 }}>{contact.display_name || contact.username}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={handleCreateGroup}
          disabled={loading}
          style={{
            width: '100%',
            padding: 15,
            marginTop: 16,
            background: loading ? colors.textLight : colors.blue,
            color: colors.white,
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15.5,
            cursor: loading ? 'default' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(59,130,246,0.3)'
          }}
        >
          {loading ? 'Création...' : 'Créer le groupe'}
        </button>
      </div>
    </div>
  )
}
