import { colors } from './colors'

export default function Settings({ session, onBack, onLogout, onOpenProfile }) {
  return (
    <div className="screen-enter" style={{ minHeight: '100vh', background: colors.background }}>
      <div style={{ background: colors.blueDark, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, color: colors.white, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(30,64,175,0.25)' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', color: colors.white, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Paramètres</h2>
      </div>

      <div className="modal-content-enter" style={{ maxWidth: 600, margin: '0 auto', padding: 22 }}>
        <div
          onClick={onOpenProfile}
          style={{
            background: colors.white,
            borderRadius: 14,
            padding: 17,
            marginBottom: 18,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: colors.text, fontSize: 15.5 }}>Mon profil</p>
            <p style={{ margin: '4px 0 0', color: colors.textLight, fontSize: 13 }}>{session.user.email}</p>
          </div>
          <span style={{ fontSize: 22, color: colors.textLight }}>›</span>
        </div>

        <div style={{ background: colors.white, borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 18, overflow: 'hidden' }}>
          <div style={{ padding: 17, borderBottom: `1px solid ${colors.border}` }}>
            <p style={{ margin: 0, color: colors.textLight, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Application</p>
            <p style={{ margin: '5px 0 0', color: colors.text, fontWeight: 600, fontSize: 15 }}>P-Scalium Chat</p>
          </div>
          <div style={{ padding: 17 }}>
            <p style={{ margin: 0, color: colors.textLight, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Version</p>
            <p style={{ margin: '5px 0 0', color: colors.text, fontWeight: 600, fontSize: 15 }}>1.0</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: 15,
            background: '#FEE2E2',
            color: colors.danger,
            border: `1.5px solid ${colors.danger}`,
            borderRadius: 12,
            fontWeight: 700,
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
