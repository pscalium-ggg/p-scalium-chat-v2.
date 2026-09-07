import { colors } from './colors'

export default function Settings({ session, onBack, onLogout, onOpenProfile }) {
  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      <div
        style={{
          background: colors.blueDark,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: colors.white,
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <button onClick={onBack} style={{ border: 'none', background: 'none', color: colors.white, fontSize: 20, cursor: 'pointer' }}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}>Paramètres</h2>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <div
          onClick={onOpenProfile}
          style={{
            background: colors.white,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: colors.text, fontSize: 15 }}>Mon profil</p>
            <p style={{ margin: '4px 0 0', color: colors.textLight, fontSize: 13 }}>{session.user.email}</p>
          </div>
          <span style={{ fontSize: 20, color: colors.textLight }}>›</span>
        </div>

        <div style={{ background: colors.white, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
            <p style={{ margin: 0, color: colors.textLight, fontSize: 13 }}>Application</p>
            <p style={{ margin: '4px 0 0', color: colors.text, fontWeight: 500 }}>P-Scalium Chat</p>
          </div>
          <div style={{ padding: 16 }}>
            <p style={{ margin: 0, color: colors.textLight, fontSize: 13 }}>Version</p>
            <p style={{ margin: '4px 0 0', color: colors.text, fontWeight: 500 }}>1.0</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: 14,
            background: '#FEE2E2',
            color: colors.danger,
            border: `1px solid ${colors.danger}`,
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer'
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
