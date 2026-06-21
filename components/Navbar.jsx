const Navbar = () => (
  <header
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: '64px',
      background: 'rgba(5,20,36,0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(59,73,76,0.4)',
    }}
  >
    {/* Brand */}
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', color: '#00daf3' }}>
      SAJAK_AI
    </div>

    {/* Nav links */}
    <nav style={{ display: 'flex', gap: '32px' }}>
      {['How it Works', 'API', 'Enterprise'].map(l => (
        <a key={l} href="#"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', letterSpacing: '0.05em', color: '#bac9cc', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => e.target.style.color = '#00daf3'}
          onMouseLeave={e => e.target.style.color = '#bac9cc'}
        >{l}</a>
      ))}
    </nav>

    {/* Actions */}
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <button style={{ padding: '8px 20px', background: 'transparent', border: 'none', color: '#bac9cc', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', cursor: 'pointer', borderRadius: '4px', transition: 'color 0.2s' }}
        onMouseEnter={e => e.target.style.color = '#c3f5ff'}
        onMouseLeave={e => e.target.style.color = '#bac9cc'}
      >Login</button>
      <button style={{ padding: '8px 20px', background: '#00e5ff', border: 'none', color: '#00363d', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, cursor: 'pointer', borderRadius: '4px', transition: 'opacity 0.2s' }}
        onMouseEnter={e => e.target.style.opacity = '0.85'}
        onMouseLeave={e => e.target.style.opacity = '1'}
      >Sign Up</button>
    </div>
  </header>
)

export default Navbar
