const Navbar = ({ theme = 'dark', onNavClick }) => {
  const isLight = theme === 'light';
  return (
  <header
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: '64px',
      background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(5,20,36,0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: isLight ? '1px solid rgba(203,210,217,0.4)' : '1px solid rgba(59,73,76,0.4)',
    }}
  >
    {/* Brand */}
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', color: isLight ? '#005bb5' : '#00daf3' }}>
      SAJAK_AI
    </div>

    {/* Nav links */}
    <nav style={{ display: 'flex', gap: '32px' }}>
      {['How it Works', 'API', 'Enterprise'].map(l => (
        <a key={l} href="#"
          onClick={(e) => { e.preventDefault(); if (onNavClick) onNavClick(l); }}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', letterSpacing: '0.05em', color: isLight ? '#475569' : '#bac9cc', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => e.target.style.color = isLight ? '#005bb5' : '#00daf3'}
          onMouseLeave={e => e.target.style.color = isLight ? '#475569' : '#bac9cc'}
        >{l}</a>
      ))}
    </nav>


  </header>
  )
}

export default Navbar
