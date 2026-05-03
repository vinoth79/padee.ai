// Padee v4 — shared components (correct layout system)
// Layout: Dark horizontal top nav + main + right rail + persistent footer strip

// ── Icons (lucide-style, 24x24 viewBox) ─────────────────────────────
const Icon = {
  home:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>,
  ask:     (p)=><svg {...p} viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>,
  learn:   (p)=><svg {...p} viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  tests:   (p)=><svg {...p} viewBox="0 0 24 24"><path d="M9 2h6l5 5v15H4V7l5-5z"/><path d="M9 2v5H4"/><path d="M9 15l2 2 4-4"/></svg>,
  progress:(p)=><svg {...p} viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>,
  live:    (p)=><svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/></svg>,
  profile: (p)=><svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  settings:(p)=><svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>,
  logout:  (p)=><svg {...p} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>,
  camera:  (p)=><svg {...p} viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  mic:     (p)=><svg {...p} viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg>,
  send:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>,
  sparkle: (p)=><svg {...p} viewBox="0 0 24 24"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>,
  bell:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  flame:   (p)=><svg {...p} viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2.4-2-4-4-3-3-4-3-5 0 0-1 2 1 5 0 0-4.5 2-4.5 5.5a6.5 6.5 0 0 0 13 0c0-3-1-5-3-6-.5-.5-1-1-1-2 0 0-1 2 0 4s-2 3-2 5"/></svg>,
  clock:   (p)=><svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  check:   (p)=><svg {...p} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>,
  x:       (p)=><svg {...p} viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  arrow:   (p)=><svg {...p} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  arrowL:  (p)=><svg {...p} viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  plus:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  search:  (p)=><svg {...p} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>,
  filter:  (p)=><svg {...p} viewBox="0 0 24 24"><path d="M22 3H2l8 9.5V19l4 2v-8.5z"/></svg>,
  users:   (p)=><svg {...p} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  doc:     (p)=><svg {...p} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  upload:  (p)=><svg {...p} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>,
  download:(p)=><svg {...p} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>,
  copy:    (p)=><svg {...p} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  edit:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>,
  trash:   (p)=><svg {...p} viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>,
  thumbUp: (p)=><svg {...p} viewBox="0 0 24 24"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l5.5-10L14 1a2 2 0 0 1 1 1.74z"/></svg>,
  thumbDn: (p)=><svg {...p} viewBox="0 0 24 24" style={{transform:'rotate(180deg)'}}><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l5.5-10L14 1a2 2 0 0 1 1 1.74z"/></svg>,
  flag:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg>,
  trophy:  (p)=><svg {...p} viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 0 12 0M6 9V3h12v6M9 22h6M10 22l1-5h2l1 5M4 5h2M18 5h2"/></svg>,
  chevronR:(p)=><svg {...p} viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>,
  chevronD:(p)=><svg {...p} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>,
  star:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M12 2l3 7 7 .7-5.3 4.9L18 22l-6-3.5L6 22l1.3-7.4L2 9.7 9 9z"/></svg>,
  play:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M5 3l14 9-14 9z"/></svg>,
  pause:   (p)=><svg {...p} viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  heart:   (p)=><svg {...p} viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>,
  heartOut:(p)=><svg {...p} viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>,
  cmdk:    (p)=><svg {...p} viewBox="0 0 24 24"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>,
};
const Ico = ({name, size=18, color='currentColor', stroke=1.8, ...rest}) =>
  React.cloneElement(Icon[name]({}), { width:size, height:size, stroke:color, fill:'none', strokeWidth:stroke, strokeLinecap:'round', strokeLinejoin:'round', ...rest });

// ── Avatar ───────────────────────────────────────────────────────
function Avatar({ name='Aarav K', size=36, color='#E85D3A', grad=null }) {
  const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return (
    <div style={{width:size, height:size, borderRadius: size>=60 ? 12 : '50%', background: grad || color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:size*0.38, flexShrink:0, letterSpacing:'-0.5px'}}>{initials}</div>
  );
}

// ── Pa (mascot) wrapper ──────────────────────────────────────────
function Pa({ state='idle', size=60, bg=null }) {
  const mood = {idle:'happy', thinking:'think', speaking:'cheer', celebrate:'sparkle'}[state] || 'happy';
  return <Mascot size={size} mood={mood} bg={bg}/>;
}

// ── Ring ─────────────────────────────────────────────────────────
function Ring({ pct=0.7, size=80, stroke=8, color='#E85D3A', track='#F1EDE2', gradient=false, children }) {
  const r = (size-stroke)/2; const c = 2*Math.PI*r;
  const gid = `g-${Math.random().toString(36).slice(2,7)}`;
  return (
    <div className="ring-wrap" style={{width:size, height:size}}>
      <svg width={size} height={size}>
        {gradient && <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFB547"/><stop offset="100%" stopColor="#E85D3A"/></linearGradient></defs>}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={gradient?`url(#${gid})`:color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c*(1-pct)}
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

// ── Flame (animated) ─────────────────────────────────────────────
function Flame({ size=24, dim=false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={dim?'':'flame-anim'} style={{opacity:dim?0.3:1}}>
      <path d="M16 3 C 13 8 9 11 9 17 C 9 22 12 26 16 26 C 20 26 23 22 23 17 C 23 13 20 11 19 8 C 18 11 16 12 16 12 C 16 12 17 8 16 3 Z" fill="#FFB547"/>
      <path d="M16 12 C 14 15 12 16 12 19 C 12 22 14 24 16 24 C 18 24 20 22 20 19 C 20 17 19 15 18 13 C 18 15 16 15 16 15 Z" fill="#E85D3A"/>
    </svg>
  );
}

// ── DARK TOP NAV (student) ───────────────────────────────────────
function StudentTopNav({ active='home', name='Aarav', streak=7, level=6, grade='Class 9', studentBadge=null }) {
  const items = [
    {id:'home',     label:'Home',     icon:'home'},
    {id:'ask',      label:'Ask Pa',   icon:'ask',    badge:'AI'},
    {id:'learn',    label:'Learn',    icon:'learn'},
    {id:'tests',    label:'Tests',    icon:'tests'},
    {id:'progress', label:'Progress', icon:'progress'},
  ];
  return (
    <div className="pd-topnav">
      <div className="brand">
        <Mascot size={28} mood="happy"/>
        <span className="logo-text">Padee<span className="logo-ai">.ai</span></span>
      </div>
      <div className="nav-pills">
        {items.map(it => (
          <div key={it.id} className={`nav-pill ${active===it.id?'active':''}`}>
            <Ico name={it.icon} size={16}/>
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </div>
        ))}
      </div>
      <div className="search-bar">
        <Ico name="search" size={14} color="rgba(255,255,255,0.4)"/>
        <span>Ask anything from your syllabus…</span>
        <span className="cmdk">⌘K</span>
      </div>
      <div className="streak-badge">
        <Flame size={16}/><span className="tabular">{streak} days</span>
      </div>
      <div className="user-mini">
        <Avatar name={name} size={34}/>
        <div>
          <div className="name">{name}</div>
          <div className="sub">{grade} · Lv {level}</div>
        </div>
      </div>
    </div>
  );
}

// ── DARK TOP NAV (teacher) ───────────────────────────────────────
function TeacherTopNav({ active='home', name='Priya M' }) {
  const items = [
    {id:'home',      label:'Command',     icon:'home'},
    {id:'worksheet', label:'Worksheet',   icon:'doc'},
    {id:'mimic',     label:'Paper Mimic', icon:'copy'},
    {id:'tests',     label:'Tests',       icon:'tests'},
    {id:'students',  label:'Students',    icon:'users'},
    {id:'review',    label:'Review',      icon:'flag', badge:'3'},
    {id:'live',      label:'Live class',  icon:'live'},
  ];
  return (
    <div className="pd-topnav">
      <div className="brand">
        <Mascot size={28} mood="happy"/>
        <span className="logo-text">Padee<span className="logo-ai">.ai</span></span>
        <span style={{background:'var(--c-accent)', color:'#fff', fontSize:9, fontWeight:700, letterSpacing:'0.1em', padding:'2px 6px', borderRadius:4, marginLeft:4}}>TEACHER</span>
      </div>
      <div className="nav-pills">
        {items.map(it => (
          <div key={it.id} className={`nav-pill ${active===it.id?'active':''}`}>
            <Ico name={it.icon} size={16}/>
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge" style={{background:'var(--c-pink)'}}>{it.badge}</span>}
          </div>
        ))}
      </div>
      <div className="search-bar">
        <Ico name="search" size={14} color="rgba(255,255,255,0.4)"/>
        <span>Search students, questions, concepts…</span>
        <span className="cmdk">⌘K</span>
      </div>
      <div className="user-mini">
        <Avatar name={name} size={34} color="#7C5CFF"/>
        <div>
          <div className="name">{name}</div>
          <div className="sub">Class 9 · Math</div>
        </div>
      </div>
    </div>
  );
}

// ── Page header ("03 — DESKTOP" eyebrow + title) ─────────────────
function PageHeader({ eyebrow, title, right }) {
  return (
    <div className="pd-page-head">
      <div>
        <div className="t-eyebrow" style={{color:'var(--c-accent)', marginBottom:3}}>{eyebrow}</div>
        <div style={{fontSize:22, fontWeight:700, letterSpacing:'-0.4px'}}>{title}</div>
      </div>
      <div className="t-sm" style={{color:'var(--c-muted)'}}>{right}</div>
    </div>
  );
}

// ── RIGHT RAIL WIDGETS ───────────────────────────────────────────
function PaStatusCard({ subject='Science', state='idle' }) {
  return (
    <div className="rail-card" style={{display:'flex', alignItems:'center', gap:10, padding:'12px 14px'}}>
      <Pa state={state} size={40}/>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:14, fontWeight:700, letterSpacing:'-0.2px'}}>Pa</div>
        <div className="t-xs" style={{display:'flex', alignItems:'center', gap:5}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:'var(--c-green)'}}/>
          {state==='thinking'? `Thinking in ${subject}…` : `Your AI study buddy`}
        </div>
      </div>
    </div>
  );
}

function QuickQuestCard({ title='Ohm\'s Law — 5 questions', min=4, xp=30 }) {
  return (
    <div className="rail-card">
      <div className="t-eyebrow" style={{color:'var(--c-accent)', marginBottom:6}}>QUICK QUEST</div>
      <div style={{fontSize:14, fontWeight:600, marginBottom:6, letterSpacing:'-0.2px'}}>{title}</div>
      <div className="t-xs tabular" style={{display:'flex', gap:10, marginBottom:10}}>
        <span style={{display:'inline-flex', alignItems:'center', gap:3}}><Ico name="clock" size={11}/>{min} min</span>
        <span style={{display:'inline-flex', alignItems:'center', gap:3}}><Ico name="sparkle" size={11} color="#FFB547"/>+{xp} XP</span>
      </div>
      <button className="pd-btn ink" style={{width:'100%', padding:'10px 14px', fontSize:13}}>Start quest <Ico name="arrow" size={13}/></button>
    </div>
  );
}

function AskPaSuggestionsCard({ items=['How does osmosis work?',"Explain Newton's 3rd law",'Quiz me on fractions'] }) {
  return (
    <div>
      <div className="t-eyebrow" style={{marginBottom:8, padding:'0 4px'}}>TRY ASKING PA</div>
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        {items.map((q,i)=>(
          <div key={i} className="suggest-pill">
            <Ico name="ask" size={13} color="var(--c-muted)"/>
            <span>{q}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumeCard({ subject='Science', chapter='Ch 7 · Motion', progress=62 }) {
  const color = (window.SUBJECT_COLOR && window.SUBJECT_COLOR[subject]) || 'var(--c-accent)';
  return (
    <div className="rail-card" style={{padding:12}}>
      <div className="t-eyebrow" style={{color:'var(--c-muted)', marginBottom:6}}>PICK UP WHERE YOU LEFT OFF</div>
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
        <div style={{width:34, height:34, borderRadius:9, background:color+'22', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
          <Ico name="learn" size={18}/>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13, fontWeight:700, color:'var(--c-ink)', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{chapter}</div>
          <div style={{fontSize:11, color:'var(--c-muted)', marginTop:1}}>{subject}</div>
        </div>
      </div>
      <div className="pd-progress" style={{marginBottom:6}}><span style={{width:progress+'%', background:color}}/></div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'var(--c-muted)'}}>
        <span className="tabular">{progress}% complete</span>
        <span style={{color, fontWeight:600, cursor:'pointer'}}>Resume →</span>
      </div>
    </div>
  );
}

// ── FOOTER STRIP (persistent XP + mastery + badges) ──────────────
function FooterStrip({ xpToday=35, xpGoal=50, week=[15,10,10,0,0,0,0], mastery, badges=['🔥','🎯','⚡','🏆','✨'] }) {
  const masteryData = mastery || [
    {name:'Maths',   pct:72, color:'var(--c-violet)', delta:'+3'},
    {name:'Science', pct:58, color:'var(--c-accent)', delta:'-2'},
    {name:'English', pct:84, color:'var(--c-green)',  delta:'+1'},
    {name:'Social',  pct:46, color:'var(--c-amber)',  delta:'-3'},
    {name:'Hindi',   pct:67, color:'var(--c-pink)',   delta:'0'},
  ];
  return (
    <div className="pd-footer">
      {/* Today XP ring */}
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <Ring pct={xpToday/xpGoal} size={44} stroke={5} color="var(--c-accent)">
          <div className="tabular" style={{fontSize:12, fontWeight:700}}>{xpToday}</div>
        </Ring>
        <div>
          <div className="t-eyebrow" style={{marginBottom:2}}>TODAY</div>
          <div style={{fontSize:13, fontWeight:600}} className="tabular">{xpToday} / {xpGoal} XP</div>
          <div className="t-xs tabular" style={{display:'flex', gap:6, marginTop:2}}>
            {week.map((v,i)=>(
              <span key={i} style={{color:v>0?'var(--c-ink-2)':'var(--c-muted-2)'}}>{v>0?v:'–'}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="pd-footer-divider"/>
      {/* Subject mastery */}
      <div style={{flex:1, minWidth:0}}>
        <div className="t-eyebrow" style={{marginBottom:6}}>SUBJECT MASTERY</div>
        <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          {masteryData.map((m,i)=>(
            <div key={i} style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12}}>
              <span style={{width:8, height:8, borderRadius:'50%', background:m.color}}/>
              <b>{m.name}</b>
              <span className="tabular" style={{color:'var(--c-muted)'}}>{m.pct}%</span>
              <span className="tabular" style={{color: m.delta.startsWith('+')?'var(--c-green)':m.delta.startsWith('-')?'var(--c-pink)':'var(--c-muted-2)', fontSize:10, fontWeight:600}}>{m.delta}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pd-footer-divider"/>
      {/* Badges row */}
      <div>
        <div className="t-eyebrow" style={{marginBottom:6, textAlign:'right'}}>BADGES · 4 OF 24</div>
        <div style={{display:'flex', gap:4}}>
          {badges.map((b,i)=>(
            <div key={i} style={{width:28, height:28, borderRadius:8, background:'var(--c-paper)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, border:'1px solid var(--c-hair)'}}>{b}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Subject colors ───────────────────────────────────────────────
const SUBJECT_COLOR = {
  Maths:     {bg:'#EEE3FF',           fg:'#5B2FB8', accent:'var(--c-violet)'},
  Science:   {bg:'var(--c-accent-l)', fg:'var(--c-accent-d)', accent:'var(--c-accent)'},
  Physics:   {bg:'var(--c-blue-l)',   fg:'#1D47C4', accent:'var(--c-blue)'},
  Chemistry: {bg:'var(--c-accent-l)', fg:'var(--c-accent-d)', accent:'var(--c-accent)'},
  Biology:   {bg:'var(--c-green-l)',  fg:'#0F7A4F', accent:'var(--c-green)'},
  English:   {bg:'var(--c-green-l)',  fg:'#0F7A4F', accent:'var(--c-green)'},
  Social:    {bg:'var(--c-amber-l)',  fg:'#8A5A00', accent:'var(--c-amber)'},
  'Social Studies': {bg:'var(--c-amber-l)',  fg:'#8A5A00', accent:'var(--c-amber)'},
  Hindi:     {bg:'var(--c-pink-l)',   fg:'#A61E57', accent:'var(--c-pink)'},
  CS:        {bg:'var(--c-cyan-l)',   fg:'#0E6A82', accent:'var(--c-cyan)'},
};

function SubjectPill({ subject='Maths', pct=null, active=false }) {
  const s = SUBJECT_COLOR[subject] || SUBJECT_COLOR.Maths;
  return (
    <span className="subject-pill" style={{background: active?s.accent:'transparent', color: active?'#fff':'var(--c-ink)', border: active?'none':'1px solid var(--c-hair)'}}>
      <span style={{width:8, height:8, borderRadius:'50%', background: active?'#fff':s.accent}}/>
      <b>{subject}</b>
      {pct!=null && <span className="tabular" style={{color: active?'rgba(255,255,255,0.8)':'var(--c-muted)'}}>{pct}%</span>}
    </span>
  );
}

function DifficultyBadge({ level='medium' }) {
  const m = {easy:{c:'var(--c-green)',l:'Easy'}, medium:{c:'var(--c-amber)',l:'Medium'}, hard:{c:'var(--c-pink)',l:'Hard'}}[level];
  return <span className="pd-chip" style={{background:`${m.c}22`, color:m.c, fontSize:11, fontWeight:700}}>{m.l}</span>;
}

// ── Whiteboard card (Pa teaches) ────────────────────────────────
function WhiteboardCard({ title='WHITEBOARD', children }) {
  return (
    <div className="whiteboard-card">
      <div className="t-eyebrow" style={{color:'var(--c-accent)', marginBottom:10}}>{title}</div>
      <div style={{fontFamily:'"Kalam", "Lexend Deca", serif', fontSize:15, lineHeight:1.6, color:'var(--c-ink-2)'}}>
        {children}
      </div>
    </div>
  );
}

// ── App shell: TopNav + content + rail + footer ──────────────────
function StudentShell({ active, rail=true, footer=true, children, eyebrow, title, headerRight, streak=7 }) {
  return (
    <div className="pd-app2" style={{width:1300, height:840}}>
      <StudentTopNav active={active} streak={streak}/>
      <div className="pd-page">
        <PageHeader eyebrow={eyebrow} title={title} right={headerRight}/>
        <div className="pd-body-grid" style={{gridTemplateColumns: rail ? '1fr 240px' : '1fr'}}>
          <div className="pd-body-main">{children}</div>
          {rail && <aside className="pd-body-rail">
            <PaStatusCard/>
            <QuickQuestCard/>
            <AskPaSuggestionsCard/>
            <div style={{flex:1}}/>
            <ResumeCard/>
          </aside>}
        </div>
      </div>
      {footer && <FooterStrip/>}
    </div>
  );
}

function TeacherShell({ active, rail=true, footer=false, children, eyebrow, title, headerRight }) {
  return (
    <div className="pd-app2" style={{width:1300, height:840}}>
      <TeacherTopNav active={active}/>
      <div className="pd-page">
        <PageHeader eyebrow={eyebrow} title={title} right={headerRight}/>
        <div className="pd-body-grid" style={{gridTemplateColumns: rail ? '1fr 280px' : '1fr'}}>
          <div className="pd-body-main">{children}</div>
          {rail}
        </div>
      </div>
    </div>
  );
}

// ── Citation chip ────────────────────────────────────────────────
function Citation({ source }) {
  return <span className="pd-chip" style={{fontSize:11, padding:'4px 9px', background:'var(--c-hair-2)'}}>📖 {source}</span>;
}

// Expose
Object.assign(window, {
  Icon, Ico, Avatar, Pa, Ring, Flame,
  StudentTopNav, TeacherTopNav, PageHeader,
  PaStatusCard, QuickQuestCard, AskPaSuggestionsCard, ResumeCard,
  FooterStrip,
  SUBJECT_COLOR, SubjectPill, DifficultyBadge,
  WhiteboardCard, Citation,
  StudentShell, TeacherShell,
});
