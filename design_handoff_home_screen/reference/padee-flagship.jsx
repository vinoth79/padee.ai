// Padee v4 flagship — rebuilt to match original layout architecture
// Dark top nav + main + right rail + persistent footer strip

// ══════════════════════════════════════════════════════════════════
// 1. STUDENT HOME — cockpit dashboard
// ══════════════════════════════════════════════════════════════════
function StudentHome() {
  return (
    <StudentShell active="home"
      eyebrow="01 — DESKTOP"
      title="Home · cockpit dashboard"
      headerRight="dashboard · quests · recap">

      {/* Greeting + boss quest */}
      <div style={{marginBottom:18}}>
        <div className="t-eyebrow" style={{marginBottom:6}}>GOOD AFTERNOON</div>
        <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:20, marginBottom:6}}>
          <div style={{flex:1}}>
            <div style={{fontSize:30, fontWeight:700, letterSpacing:'-0.6px', lineHeight:1.1}}>
              Hey Aarav, ready to level up? <span style={{fontSize:22}}>🎯</span>
            </div>
            <div className="t-sm" style={{marginTop:6}}>You're <b style={{color:'var(--c-ink)'}}>15 XP</b> away from today's goal. 4 min of <b style={{color:'var(--c-ink)'}}>Work & Energy</b> closes it.</div>
          </div>
          <div className="pd-card flat" style={{padding:'10px 14px', display:'flex', alignItems:'center', gap:8}}>
            <Ico name="clock" size={14}/>
            <div className="t-xs" style={{display:'flex', gap:6}}>
              <span>Study time today</span>
              <b className="tabular" style={{color:'var(--c-ink)'}}>22m</b>
            </div>
          </div>
        </div>
      </div>

      {/* Boss quest — dark hero card */}
      <div className="pd-card" style={{background:'#13131A', color:'#fff', padding:22, position:'relative', overflow:'hidden', marginBottom:18, borderRadius:20}}>
        <div className="t-eyebrow" style={{color:'var(--c-amber)', marginBottom:6}}>★ TODAY'S BOSS QUEST</div>
        <div style={{fontSize:22, fontWeight:700, letterSpacing:'-0.4px', marginBottom:6, maxWidth:540}}>
          Fix your Newton's 2nd Law gap — you got 3/5 wrong yesterday.
        </div>
        <div style={{fontSize:13, color:'rgba(255,255,255,0.7)', marginBottom:14, maxWidth:560}}>
          Pa picked 5 targeted questions just for you. Beat this and unlock the <b style={{color:'var(--c-accent)'}}>Force Crusher</b> badge.
        </div>
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <button className="pd-btn primary">Start boss quest <Ico name="arrow" size={14}/></button>
          <button className="pd-btn ghost" style={{color:'#fff'}}>See plan</button>
          <div style={{display:'flex', gap:14, marginLeft:'auto', fontSize:12, color:'rgba(255,255,255,0.7)'}} className="tabular">
            <span style={{display:'inline-flex', alignItems:'center', gap:4}}><Ico name="clock" size={12}/>4 min</span>
            <span style={{display:'inline-flex', alignItems:'center', gap:4}}><Ico name="sparkle" size={12} color="#FFB547"/>+50 XP</span>
            <span style={{display:'inline-flex', alignItems:'center', gap:4}}><Ico name="heart" size={12} color="#FF4D8B"/>3 lives</span>
          </div>
        </div>
        {/* Pa on the side */}
        <div style={{position:'absolute', right:-10, top:-10, opacity:0.95}}>
          <Pa state="celebrate" size={130}/>
        </div>
      </div>

      {/* 3 quest cards row */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginBottom:18}}>
        <QuestCard
          icon="play" iconBg="var(--c-purple-l)" iconFg="var(--c-purple)"
          xp={15} xpColor="var(--c-purple)"
          title="Continue: Work & Energy"
          meta="Physics · Chapter 9"
          progress={0.55}
          progressColor="var(--c-purple)"
        />
        <QuestCard
          icon="sparkle" iconBg="var(--c-amber-l)" iconFg="var(--c-amber)"
          xp={50} xpColor="var(--c-amber)"
          title="Daily challenge"
          meta="Mixed · 5 MCQs"
          progress={null}
          cta="Start →"
        />
        <QuestCard
          icon="learn" iconBg="var(--c-blue-l)" iconFg="var(--c-blue)"
          xp={10} xpColor="var(--c-blue)"
          title="Revise: Momentum"
          meta="Physics · 4 days ago"
          progress={null}
          cta="Review →"
        />
      </div>

      {/* Weak concepts + upcoming tests */}
      <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:14}}>
        {/* Weak concepts Pa spotted */}
        <div className="pd-card" style={{padding:18}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
            <div>
              <div className="t-eyebrow" style={{color:'var(--c-accent)', marginBottom:2}}>PA SPOTTED · WEAK SPOTS</div>
              <div style={{fontSize:17, fontWeight:700, letterSpacing:'-0.3px'}}>3 concepts to revisit before Friday</div>
            </div>
            <a className="t-sm" style={{color:'var(--c-accent)', fontWeight:600}}>See all →</a>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {[
              {topic:"Newton's 2nd law", subject:'Physics', mastery:42, delta:-14, color:'var(--c-accent)', reason:'3 of last 5 wrong'},
              {topic:'Momentum',         subject:'Physics', mastery:38, delta:-8,  color:'var(--c-accent)', reason:'Quiz yesterday: 4/10'},
              {topic:'Linear equations', subject:'Maths',   mastery:56, delta:-5,  color:'var(--c-violet)', reason:'Skipped last 2 HWs'},
            ].map((w,i)=>(
              <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 12px', border:'1px solid var(--c-hair)', borderRadius:10, cursor:'pointer'}}>
                <div style={{width:36, height:36, borderRadius:9, background:w.color+'18', color:w.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <Ico name="flag" size={16}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13.5, fontWeight:700, lineHeight:1.2}}>{w.topic}</div>
                  <div className="t-xs" style={{marginTop:2, color:'var(--c-muted)'}}>{w.subject} · {w.reason}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div className="tabular" style={{fontSize:13, fontWeight:700, color:w.color}}>{w.mastery}%</div>
                  <div className="t-xs tabular" style={{color:'#D84A3A', marginTop:1}}>{w.delta}%</div>
                </div>
                <Ico name="chevronR" size={14} color="var(--c-muted-2)"/>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming tests */}
        <div className="pd-card" style={{padding:18}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
            <div>
              <div className="t-eyebrow" style={{color:'var(--c-accent)', marginBottom:2}}>UPCOMING TESTS</div>
              <div style={{fontSize:17, fontWeight:700, letterSpacing:'-0.3px'}}>This week</div>
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {[
              {title:'Unit test · Force & Laws', subject:'Physics', when:'Fri · 2 days', prep:62, urgent:true},
              {title:'Chapter quiz · Linear eqs', subject:'Maths',  when:'Mon · 5 days', prep:40, urgent:false},
            ].map((t,i)=>(
              <div key={i} style={{padding:'10px 12px', border:'1px solid var(--c-hair)', borderRadius:10, background: t.urgent ? 'var(--c-amber-l)' : 'transparent'}}>
                <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:3}}>
                  <span className="t-xs" style={{fontWeight:700, color: t.urgent ? '#8A5A00' : 'var(--c-muted)', letterSpacing:'0.04em', textTransform:'uppercase'}}>{t.when}</span>
                </div>
                <div style={{fontSize:13, fontWeight:700, lineHeight:1.2, marginBottom:2}}>{t.title}</div>
                <div className="t-xs" style={{color:'var(--c-muted)', marginBottom:6}}>{t.subject}</div>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <div className="pd-progress" style={{flex:1, height:5}}>
                    <span style={{width:`${t.prep}%`, background: t.urgent ? 'var(--c-accent)' : 'var(--c-violet)'}}/>
                  </div>
                  <span className="tabular t-xs" style={{fontWeight:600, color:'var(--c-muted)'}}>{t.prep}%</span>
                </div>
                <div style={{marginTop:8, fontSize:11.5, fontWeight:600, color: t.urgent ? 'var(--c-accent-d)' : 'var(--c-violet)', cursor:'pointer'}}>Start prep plan →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}

function QuestCard({ icon, iconBg, iconFg, xp, xpColor, title, meta, progress, progressColor, cta }) {
  return (
    <div className="pd-card flat" style={{padding:16, position:'relative'}}>
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12}}>
        <div style={{width:40, height:40, borderRadius:12, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <Ico name={icon} size={18} color={iconFg}/>
        </div>
        <div className="pd-chip" style={{background:`${xpColor}22`, color:xpColor, fontWeight:700, fontSize:11}}>+{xp} XP</div>
      </div>
      <div style={{fontWeight:700, fontSize:15, letterSpacing:'-0.2px', marginBottom:3}}>{title}</div>
      <div className="t-sm">{meta}</div>
      {progress != null && (
        <div className="pd-progress" style={{marginTop:12, height:6}}>
          <span style={{width:`${progress*100}%`, background:progressColor}}/>
        </div>
      )}
      {cta && <div style={{fontSize:12, fontWeight:600, color:'var(--c-accent)', marginTop:10}}>{cta}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 2. ASK PA — chat + whiteboard
// ══════════════════════════════════════════════════════════════════
function AskPa() {
  return (
    <div className="pd-app2" style={{width:1300, height:840}}>
      <StudentTopNav active="ask"/>
      <div className="pd-page">
        <PageHeader eyebrow="02 — DESKTOP" title="Ask Pa · AI tutor + whiteboard" right="chat · voice · snap"/>

        {/* Pa header strip */}
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
          <Pa state="speaking" size={48}/>
          <div style={{flex:1}}>
            <div style={{fontSize:19, fontWeight:700, letterSpacing:'-0.3px'}}>Pa · your study buddy</div>
            <div className="t-xs" style={{display:'flex', alignItems:'center', gap:5}}>
              <span style={{width:6, height:6, borderRadius:'50%', background:'var(--c-green)'}}/>
              Thinking in Science · Class 9
            </div>
          </div>
          <button className="pd-btn outline sm"><Ico name="mic" size={14}/>Voice</button>
          <button className="pd-btn outline sm"><Ico name="camera" size={14}/>Snap</button>
        </div>

        {/* Chat column (no sidebar, centered) */}
        <div style={{flex:1, display:'flex', flexDirection:'column', maxWidth:820, width:'100%', margin:'0 auto', minHeight:0}}>
          <div style={{flex:1, overflow:'auto', paddingRight:4}}>
            {/* User Q */}
            <div style={{display:'flex', justifyContent:'flex-end', marginBottom:16}}>
              <div style={{background:'#13131A', color:'#fff', padding:'11px 16px', borderRadius:'16px 16px 4px 16px', maxWidth:500, fontSize:14, lineHeight:1.5}}>
                wait why does current drop when resistance goes up <span style={{fontSize:14}}>🤔</span> feels backwards
              </div>
            </div>

            {/* Pa reply */}
            <div style={{display:'flex', gap:10, marginBottom:12}}>
              <Pa state="speaking" size={32}/>
              <div style={{flex:1, maxWidth:680}}>
                <div style={{fontSize:14, lineHeight:1.65, marginBottom:12}}>
                  Not backwards at all — think of it like a water slide <span style={{fontSize:14}}>💧</span><br/>
                  The skinnier the slide (more resistance), the slower water flows. Same with electrons. Here, watch:
                </div>
                <WhiteboardCard title="WHITEBOARD">
                  <div style={{textAlign:'center', fontSize:36, fontWeight:700, marginBottom:14, letterSpacing:'-0.5px', fontFamily:'"Kalam", serif'}}>
                    I = <span style={{color:'var(--c-green)'}}>V</span> / <span style={{color:'var(--c-accent)'}}>R</span>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:10}}>
                    <div style={{background:'#fff', padding:12, borderRadius:10, border:'1.5px solid var(--c-hair)'}}>
                      <div style={{fontSize:11, color:'var(--c-muted)', fontFamily:'var(--f-sans)', marginBottom:4}}>If R = 2Ω</div>
                      <div style={{fontSize:16, fontWeight:600}}>I = 6V / 2 = <span style={{color:'var(--c-green)'}}>3A</span></div>
                    </div>
                    <div style={{background:'#fff', padding:12, borderRadius:10, border:'1.5px solid var(--c-hair)'}}>
                      <div style={{fontSize:11, color:'var(--c-muted)', fontFamily:'var(--f-sans)', marginBottom:4}}>If R = 6Ω</div>
                      <div style={{fontSize:16, fontWeight:600}}>I = 6V / 6 = <span style={{color:'var(--c-accent)'}}>1A</span></div>
                    </div>
                  </div>
                  <div style={{textAlign:'center', fontSize:13, color:'var(--c-muted)', fontStyle:'italic'}}>
                    Same voltage, bigger R → smaller I. Gotcha? ✨
                  </div>
                </WhiteboardCard>

                {/* Action chips */}
                <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:14}}>
                  {['Quiz me on this','Simpler please','Got it ✓','Real-life example'].map(a=>(
                    <button key={a} className="pd-btn outline sm" style={{background:'#fff', borderRadius:99}}>{a}</button>
                  ))}
                </div>

                {/* Citations + feedback */}
                <div style={{display:'flex', alignItems:'center', gap:6, marginTop:12, flexWrap:'wrap'}}>
                  <Citation source="NCERT 10 · Ch 12 · Electricity"/>
                  <div style={{flex:1}}/>
                  <button className="pd-btn ghost sm" style={{padding:'5px 8px'}}><Ico name="thumbUp" size={13}/></button>
                  <button className="pd-btn ghost sm" style={{padding:'5px 8px'}}><Ico name="thumbDn" size={13}/></button>
                  <button className="pd-btn ghost sm" style={{padding:'5px 8px'}}><Ico name="flag" size={13}/></button>
                </div>
              </div>
            </div>
          </div>

          {/* Composer */}
          <div style={{paddingTop:12, paddingBottom:8}}>
            <div style={{background:'#fff', border:'1.5px solid var(--c-hair)', borderRadius:16, padding:8, display:'flex', alignItems:'center', gap:6}}>
              <button className="pd-btn ghost sm" style={{padding:8}}><Ico name="camera" size={18}/></button>
              <div style={{flex:1, padding:'8px 4px', color:'var(--c-muted)', fontSize:14}}>
                Ask Pa anything about your syllabus…
              </div>
              <button className="pd-btn ghost sm" style={{padding:8}}><Ico name="mic" size={18}/></button>
              <button className="pd-btn primary sm" style={{width:36, height:36, padding:0, borderRadius:'50%'}}><Ico name="send" size={15}/></button>
            </div>
          </div>
        </div>
      </div>
      <FooterStrip/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 3. TEACHER COMMAND CENTER
// ══════════════════════════════════════════════════════════════════
function TeacherCommand() {
  const rail = (
    <aside className="pd-body-rail">
      <div className="rail-card">
        <div className="t-eyebrow" style={{color:'var(--c-accent)', marginBottom:6}}>PA'S READ ON 9-B</div>
        <div style={{fontSize:13, lineHeight:1.5, marginBottom:10}}>
          3 students struggled on last night's homework. Pa drafted a 5-min recap to open class with.
        </div>
        <button className="pd-btn ink sm" style={{width:'100%'}}>Open class plan <Ico name="arrow" size={13}/></button>
      </div>
      <div className="rail-card">
        <div className="t-eyebrow" style={{marginBottom:8}}>QUICK CREATE</div>
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          {[
            ['doc','Worksheet','15Q · 40 min'],
            ['copy','Paper mimic','CBSE 2023'],
            ['tests','Test paper','Weekly'],
            ['live','Live class','Poll + AI'],
          ].map(([i,t,s])=>(
            <div key={t} className="suggest-pill">
              <div style={{width:30, height:30, borderRadius:8, background:'var(--c-accent-l)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <Ico name={i} size={14} color="var(--c-accent-d)"/>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12.5, fontWeight:600}}>{t}</div>
                <div style={{fontSize:10.5, color:'var(--c-muted)'}}>{s}</div>
              </div>
              <Ico name="chevronR" size={12} color="var(--c-muted)"/>
            </div>
          ))}
        </div>
      </div>
      <div className="rail-card dark">
        <div className="t-eyebrow" style={{color:'var(--c-amber)', marginBottom:6}}>TODAY'S NUMBERS</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <Metric n="34" l="Active"/>
          <Metric n="28" l="HW done"/>
          <Metric n="3"  l="Flagged" c="var(--c-amber)"/>
          <Metric n="82%" l="Mastery" c="var(--c-green)"/>
        </div>
      </div>
    </aside>
  );

  return (
    <TeacherShell active="home" rail={rail}
      eyebrow="01 — DESKTOP"
      title="Command Center"
      headerRight="class pulse · attention · activity">

      {/* Greeting */}
      <div style={{marginBottom:18}}>
        <div className="t-eyebrow" style={{marginBottom:6}}>TUESDAY · CLASS 9 MATH</div>
        <div style={{fontSize:28, fontWeight:700, letterSpacing:'-0.5px', lineHeight:1.1}}>
          Morning, Priya. <span style={{color:'var(--c-accent)'}}>3 things</span> need your eye.
        </div>
        <div className="t-sm" style={{marginTop:6, maxWidth:580}}>
          Kabir skipped HW again, Ananya's momentum score dropped 18%, and Rohan flagged a Pa answer. Pa drafted next steps for each.
        </div>
      </div>

      {/* Class Pulse — concept heatmap */}
      <div className="pd-card" style={{padding:18, marginBottom:14}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14}}>
          <div>
            <div className="t-eyebrow" style={{color:'var(--c-accent)', marginBottom:2}}>CLASS PULSE</div>
            <div style={{fontSize:17, fontWeight:700, letterSpacing:'-0.3px'}}>Chapter 9 · Force & Laws of Motion</div>
          </div>
          <a className="t-sm" style={{color:'var(--c-accent)', fontWeight:600}}>Full analytics →</a>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          {[
            {c:'Inertia',               m:0.92, n:34},
            {c:"Newton's 1st law",      m:0.88, n:34},
            {c:"Newton's 2nd law",      m:0.68, n:34, flag:true},
            {c:'Momentum',              m:0.52, n:30, flag:true},
            {c:"Newton's 3rd law",      m:0.74, n:32},
            {c:'Conservation of momentum', m:0.38, n:28, flag:true},
          ].map((r,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:220, fontSize:13, fontWeight:500}}>{r.c}</div>
              <div style={{flex:1}}>
                <div className="pd-progress" style={{height:12}}>
                  <span style={{width:`${r.m*100}%`, background: r.m>0.8?'var(--c-green)':r.m>0.6?'var(--c-amber)':'var(--c-pink)'}}/>
                </div>
              </div>
              <div className="tabular" style={{width:38, fontSize:13, fontWeight:600, textAlign:'right'}}>{Math.round(r.m*100)}%</div>
              <div className="t-xs tabular" style={{width:44}}>{r.n}/34</div>
              {r.flag ? <span className="pd-chip" style={{background:'var(--c-pink-l)', color:'var(--c-pink)', fontSize:10, fontWeight:700, padding:'3px 7px'}}>⚠ FOCUS</span> : <span style={{width:56}}/>}
            </div>
          ))}
        </div>
      </div>

      {/* Two cards row: attention + activity */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:14}}>
        <div className="pd-card" style={{padding:18}}>
          <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:12}}>
            <div style={{fontSize:15, fontWeight:700, letterSpacing:'-0.2px'}}>Needs attention</div>
            <span className="pd-chip" style={{background:'var(--c-pink-l)', color:'var(--c-pink)', fontSize:11, fontWeight:700}}>3</span>
          </div>
          {[
            {n:'Kabir Shah',  m:'Skipped 3 HWs', c:'#7C5CFF', urg:'high'},
            {n:'Ananya R.',   m:'Momentum ↓18%', c:'#E85D3A', urg:'med'},
            {n:'Rohan Mehta', m:'Flagged a Pa answer', c:'#36D399', urg:'low'},
          ].map((s,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderTop: i?'1px solid var(--c-hair)':'none'}}>
              <Avatar name={s.n} size={32} color={s.c}/>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:600}}>{s.n}</div>
                <div className="t-xs" style={{color: s.urg==='high'?'var(--c-pink)':'var(--c-muted)'}}>{s.m}</div>
              </div>
              <button className="pd-btn outline sm">Open</button>
            </div>
          ))}
        </div>

        <div className="pd-card" style={{padding:18}}>
          <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:12}}>
            <div style={{fontSize:15, fontWeight:700, letterSpacing:'-0.2px'}}>Recent activity</div>
            <div style={{display:'flex', gap:4}}>
              <button className="pd-btn ink sm" style={{fontSize:11, padding:'4px 10px'}}>24h</button>
              <button className="pd-btn ghost sm" style={{fontSize:11, padding:'4px 10px'}}>Week</button>
            </div>
          </div>
          {[
            {t:'2m',  n:'Aarav K.',  a:'Finished "Work" quiz', r:'9/10', c:'green'},
            {t:'14m', n:'Ria V.',    a:'Asked Pa: F=ma',       r:'👍',   c:'purple'},
            {t:'28m', n:'Kabir S.',  a:'Skipped weekly test',  r:'—',    c:'pink'},
            {t:'45m', n:'Zara M.',   a:'Completed Ch 9 practice', r:'14/16', c:'green'},
          ].map((r,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop: i?'1px solid var(--c-hair)':'none', fontSize:12.5}}>
              <div className="tabular" style={{width:32, color:'var(--c-muted)'}}>{r.t}</div>
              <div style={{width:80, fontWeight:600}}>{r.n}</div>
              <div style={{flex:1}}>{r.a}</div>
              <span className="pd-chip" style={{background:`var(--c-${r.c}-l)`, color: r.c==='green'?'#0F7A4F':r.c==='purple'?'#4B36B5':r.c==='pink'?'#A61E57':'var(--c-muted)', fontSize:11, fontWeight:600}}>{r.r}</span>
            </div>
          ))}
        </div>
      </div>
    </TeacherShell>
  );
}

function Metric({n, l, c='#fff'}) {
  return (
    <div>
      <div className="tabular" style={{fontSize:24, fontWeight:700, letterSpacing:'-0.5px', color:c}}>{n}</div>
      <div style={{fontSize:10.5, color:'rgba(255,255,255,0.6)', marginTop:2}}>{l}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 4. WORKSHEET GENERATOR
// ══════════════════════════════════════════════════════════════════
function WorksheetGen() {
  return (
    <div className="pd-app2" style={{width:1300, height:840}}>
      <TeacherTopNav active="worksheet"/>
      <div className="pd-page" style={{padding:'20px 28px 20px'}}>
        <PageHeader
          eyebrow="02 — DESKTOP"
          title="Worksheet generator · Pa drafts, you polish"
          right="draft · preview · assign"/>

        <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:20, flex:1, minHeight:0}}>
          {/* Controls */}
          <div style={{display:'flex', flexDirection:'column', gap:14, overflow:'auto', paddingRight:6}}>
            <Panel label="1 · SCOPE">
              <Field label="Class"><Select value="Class 9"/></Field>
              <Field label="Subject"><Select value="Physics"/></Field>
              <Field label="Chapter"><Select value="Ch 9 · Force & Laws"/></Field>
              <div style={{marginTop:10}}>
                <div className="t-xs" style={{marginBottom:6}}>Concepts</div>
                <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                  {[['Inertia',1],['2nd law',1],['3rd law',0],['Momentum',1],['Conservation',0]].map(([t,on],i)=>(
                    <span key={i} className="pd-chip" style={{cursor:'pointer', background: on?'var(--c-accent)':'transparent', color: on?'#fff':'var(--c-ink)', border: on?'none':'1px solid var(--c-hair)', fontWeight: on?600:500}}>{on?'✓ ':''}{t}</span>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel label="2 · SHAPE">
              <Field label="Questions"><div style={{display:'flex', alignItems:'center', gap:8}}><input type="range" min="5" max="40" defaultValue="15" style={{flex:1, accentColor:'var(--c-accent)'}}/><b className="tabular" style={{width:22}}>15</b></div></Field>
              <div style={{marginTop:10}}>
                <div className="t-xs" style={{marginBottom:6}}>Difficulty mix</div>
                <div style={{display:'flex', height:26, borderRadius:8, overflow:'hidden', border:'1px solid var(--c-hair)'}}>
                  <div style={{width:'30%', background:'var(--c-green-l)', color:'#0F7A4F', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center'}}>30% EASY</div>
                  <div style={{width:'50%', background:'var(--c-amber-l)', color:'#8A5A00', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center'}}>50% MED</div>
                  <div style={{width:'20%', background:'var(--c-pink-l)', color:'#A61E57', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center'}}>20% HARD</div>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <div className="t-xs" style={{marginBottom:6}}>Question types</div>
                <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                  {[['MCQ',1],['Short',1],['Long',0],['Numerical',1],['Diagram',0]].map(([t,on],i)=>(
                    <span key={i} className="pd-chip" style={{cursor:'pointer', background: on?'var(--c-accent)':'transparent', color: on?'#fff':'var(--c-ink)', border: on?'none':'1px solid var(--c-hair)', fontWeight: on?600:500}}>{on?'✓ ':''}{t}</span>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel label="3 · PERSONALISE">
              <Tog on={true}  label="Adapt to each student's weak spots"/>
              <Tog on={true}  label="Include marking scheme"/>
              <Tog on={false} label="Provide worked solutions"/>
              <Tog on={true}  label="Match CBSE board paper style"/>
            </Panel>

            <div className="rail-card" style={{display:'flex', alignItems:'center', gap:10}}>
              <Pa state="thinking" size={36}/>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12.5, fontWeight:600}}>Pa's estimate</div>
                <div className="t-xs">~40 min per student · 15 Qs mixed</div>
              </div>
            </div>
            <button className="pd-btn primary lg"><Ico name="sparkle" size={15}/> Regenerate with Pa</button>
          </div>

          {/* Preview */}
          <div style={{background:'var(--c-paper-2)', borderRadius:14, padding:20, overflow:'auto', border:'1px solid var(--c-hair)'}}>
            <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14}}>
              <div>
                <div style={{fontSize:13, fontWeight:700}}>Preview · Page 1 of 3</div>
                <div className="t-xs">Click any question to edit, swap, or ask Pa for a variant.</div>
              </div>
              <div style={{display:'flex', gap:6}}>
                <button className="pd-btn outline sm">Swap all</button>
                <button className="pd-btn outline sm"><Ico name="download" size={13}/>PDF</button>
                <button className="pd-btn primary sm">Assign</button>
              </div>
            </div>

            <div style={{background:'#fff', boxShadow:'0 6px 22px rgba(19,19,26,0.08)', padding:'28px 36px', maxWidth:640, margin:'0 auto', borderRadius:3, fontFamily:'Georgia, "Times New Roman", serif'}}>
              <div style={{borderBottom:'2px solid #13131A', paddingBottom:10, marginBottom:14, display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:700, fontSize:16}}>Worksheet — Force & Laws of Motion</div>
                  <div style={{fontSize:11, color:'#666', marginTop:2, fontFamily:'var(--f-sans)'}}>Class 9 · Physics · Ch 9 · 40 marks · 45 min</div>
                </div>
                <div style={{textAlign:'right', fontFamily:'var(--f-sans)', fontSize:10, color:'#666'}}>
                  <div>Name: ____________</div>
                  <div style={{marginTop:3}}>Date: ____________</div>
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:13}}>
                <WsQ num={1} m={2} type="MCQ" d="easy">
                  A 2 kg ball is pushed with 10 N force. Its acceleration is:
                  <div style={{marginTop:5, fontFamily:'var(--f-sans)', fontSize:12.5, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px 14px'}}>
                    <span>(a) 2 m/s²</span><span>(b) 5 m/s²</span>
                    <span>(c) 8 m/s²</span><span>(d) 20 m/s²</span>
                  </div>
                </WsQ>
                <WsQ num={2} m={3} type="Short" d="medium">
                  State Newton's second law and derive F = ma. Write the SI unit of force.
                </WsQ>
                <WsQ num={3} m={5} type="Numerical" d="hard">
                  A 20 g bullet moving at 150 m/s strikes a block and penetrates 30 cm. Find (a) retarding force, (b) time to stop.
                </WsQ>
                <WsQ num={4} m={2} type="MCQ" d="easy">
                  The SI unit of momentum is:
                  <div style={{marginTop:5, fontFamily:'var(--f-sans)', fontSize:12.5, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px 14px'}}>
                    <span>(a) kg·m/s²</span><span>(b) kg·m/s</span>
                    <span>(c) N/s</span><span>(d) m/s²</span>
                  </div>
                </WsQ>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({label, children}){return <div className="pd-card flat" style={{padding:14}}><div className="t-eyebrow" style={{color:'var(--c-accent)', marginBottom:10}}>{label}</div>{children}</div>;}
function Field({label, children}){return <div style={{marginBottom:8}}><div className="t-xs" style={{marginBottom:4}}>{label}</div>{children}</div>;}
function Select({value}){return <div style={{padding:'9px 11px', border:'1px solid var(--c-hair)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:13, background:'#fff', cursor:'pointer'}}><span>{value}</span><Ico name="chevronD" size={13} color="var(--c-muted)"/></div>;}
function Tog({on, label}){return <label style={{display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:8}}><div style={{width:32, height:18, borderRadius:9, background: on?'var(--c-accent)':'var(--c-hair)', position:'relative'}}><div style={{width:14, height:14, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left: on?16:2, boxShadow:'0 1px 2px rgba(0,0,0,0.2)'}}/></div><span style={{fontSize:12.5}}>{label}</span></label>;}
function WsQ({num, m, type, d, children}) {
  return (
    <div style={{display:'flex', alignItems:'flex-start', gap:8}}>
      <span style={{fontWeight:700, fontSize:13, minWidth:20}}>{num}.</span>
      <div style={{flex:1, fontSize:13, lineHeight:1.5}}>{children}</div>
      <div style={{display:'flex', gap:3, flexShrink:0, marginLeft:8, alignItems:'center'}}>
        <span className="pd-chip" style={{fontSize:9, padding:'2px 6px', fontFamily:'var(--f-sans)', background:'var(--c-hair-2)'}}>{type}</span>
        <DifficultyBadge level={d}/>
        <span style={{fontFamily:'var(--f-sans)', fontSize:10, color:'#999'}}>[{m}]</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 5. TEACHER — STUDENT PROFILE
// ══════════════════════════════════════════════════════════════════
function TeacherStudentProfile() {
  return (
    <div className="pd-app2" style={{width:1300, height:840}}>
      <TeacherTopNav active="students"/>
      <div className="pd-page">
        <PageHeader
          eyebrow="05 — DESKTOP"
          title="Student profile · Kabir Shah"
          right="timeline · concepts · nudges"/>

        {/* Hero card */}
        <div className="pd-card" style={{padding:18, marginBottom:14, display:'flex', alignItems:'center', gap:18, background:'linear-gradient(135deg, #13131A 0%, #2A2A36 100%)', color:'#fff', borderRadius:20}}>
          <Avatar name="Kabir Shah" size={72} grad="linear-gradient(135deg, #FF4D8B 0%, #7C5CFF 100%)"/>
          <div style={{flex:1}}>
            <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:3}}>
              <div style={{fontSize:11, color:'var(--c-amber)', fontWeight:700, letterSpacing:'0.12em'}}>ROOKIE · CLASS 9-B · DPS R.K.PURAM</div>
            </div>
            <div style={{fontSize:26, fontWeight:700, letterSpacing:'-0.5px', marginBottom:4}}>Kabir Shah</div>
            <div style={{display:'flex', gap:26}}>
              <HeroStat n="340" l="Total XP" c="#fff"/>
              <HeroStat n="0" icon={<Flame size={16} dim/>} l="Day streak (broken 3d ago)" c="rgba(255,255,255,0.5)"/>
              <HeroStat n="52%" l="Mastery ↓8%" c="var(--c-pink)"/>
              <HeroStat n="0/4" l="HWs done this week" c="var(--c-amber)"/>
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end'}}>
            <Pa state="thinking" size={64}/>
          </div>
        </div>

        {/* Pa insight banner */}
        <div className="pd-card" style={{padding:14, display:'flex', alignItems:'flex-start', gap:12, marginBottom:14, background:'var(--c-accent-l)', border:'1px solid #FFD4BE', borderRadius:14}}>
          <div style={{fontSize:18}}>💡</div>
          <div style={{flex:1}}>
            <div className="t-eyebrow" style={{color:'var(--c-accent-d)', marginBottom:4}}>PA'S READ ON KABIR</div>
            <div style={{fontSize:13, lineHeight:1.55, color:'var(--c-ink-2)'}}>
              Confidence dropped after failing the momentum quiz on Nov 4. Skipped HW since. His last 2 Pa chats were <i>"how do I catch up"</i>. This pattern usually precedes disengagement — reversible with a 1-on-1.
            </div>
          </div>
          <button className="pd-btn ink sm">Send nudge</button>
          <button className="pd-btn outline sm">Schedule 1:1</button>
        </div>

        {/* 3-col grid */}
        <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:14}}>
          {/* Concept mastery */}
          <div className="pd-card" style={{padding:16}}>
            <div style={{fontSize:15, fontWeight:700, letterSpacing:'-0.2px', marginBottom:12}}>Concept mastery · Physics Ch 9</div>
            {[
              {c:'Inertia',        m:0.85, s:'strong'},
              {c:"Newton's 1st",   m:0.72, s:'ok'},
              {c:"Newton's 2nd",   m:0.54, s:'weak'},
              {c:'Momentum',       m:0.22, s:'critical'},
              {c:"Newton's 3rd",   m:0.61, s:'ok'},
              {c:'Conservation',   m:0.30, s:'weak'},
            ].map((r,i)=>{
              const c = r.s==='strong'?'var(--c-green)':r.s==='ok'?'var(--c-amber)':r.s==='weak'?'var(--c-pink)':'#B21E3C';
              return (
                <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderTop: i?'1px solid var(--c-hair)':'none'}}>
                  <div style={{width:7, height:7, borderRadius:'50%', background:c}}/>
                  <div style={{flex:1, fontSize:12.5, fontWeight:500}}>{r.c}</div>
                  <div className="pd-progress" style={{width:70, height:5}}><span style={{width:`${r.m*100}%`, background:c}}/></div>
                  <div className="tabular" style={{fontSize:11.5, fontWeight:600, width:30, textAlign:'right'}}>{Math.round(r.m*100)}%</div>
                </div>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="pd-card" style={{padding:16}}>
            <div style={{fontSize:15, fontWeight:700, letterSpacing:'-0.2px', marginBottom:12}}>Recent timeline</div>
            <div style={{position:'relative', paddingLeft:16}}>
              <div style={{position:'absolute', left:5, top:6, bottom:6, width:1, background:'var(--c-hair)'}}/>
              {[
                {t:'Today',  a:'Opened Pa chat about momentum', d:'2 min · closed early', c:'var(--c-purple)'},
                {t:'2d',     a:'Skipped "Force HW #3"',         d:'Due date passed',      c:'var(--c-pink)'},
                {t:'4d',     a:'Scored 4/10 on momentum quiz',  d:'Class avg: 7/10',      c:'var(--c-pink)'},
                {t:'5d',     a:'Asked Pa "how do I catch up"',   d:'Flagged by Pa',        c:'var(--c-amber)'},
                {t:'8d',     a:'Completed Ch 8 end test',        d:'12/15 — strong',       c:'var(--c-green)'},
              ].map((e,i)=>(
                <div key={i} style={{position:'relative', paddingBottom:12}}>
                  <div style={{position:'absolute', left:-15, top:2, width:9, height:9, borderRadius:'50%', background:e.c, boxShadow:'0 0 0 3px #fff'}}/>
                  <div className="t-xs tabular" style={{marginBottom:1}}>{e.t} ago</div>
                  <div style={{fontSize:12.5, fontWeight:500, marginBottom:1}}>{e.a}</div>
                  <div className="t-xs">{e.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* XP + badges + parent */}
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="pd-card" style={{padding:16}}>
              <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:8}}>
                <div style={{fontSize:13, fontWeight:700}}>XP · last 30 days</div>
                <div className="tabular" style={{fontSize:16, fontWeight:700}}>340</div>
              </div>
              <svg width="100%" height="56" viewBox="0 0 240 56" preserveAspectRatio="none" style={{marginBottom:4}}>
                <defs><linearGradient id="xpg-k" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E85D3A" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#E85D3A" stopOpacity="0"/>
                </linearGradient></defs>
                <path d="M 0 12 L 30 10 L 60 18 L 90 12 L 120 22 L 150 34 L 180 40 L 210 46 L 240 52 L 240 56 L 0 56 Z" fill="url(#xpg-k)"/>
                <path d="M 0 12 L 30 10 L 60 18 L 90 12 L 120 22 L 150 34 L 180 40 L 210 46 L 240 52" stroke="#E85D3A" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
              <div className="t-xs" style={{color:'var(--c-pink)', fontWeight:600}}>↓ Trending down since Nov 4 quiz</div>
            </div>
            <div className="pd-card" style={{padding:16}}>
              <div style={{fontSize:13, fontWeight:700, marginBottom:10}}>Parent contact</div>
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                <Avatar name="Meera Shah" size={30} color="#36D399"/>
                <div>
                  <div style={{fontSize:12.5, fontWeight:600}}>Meera Shah</div>
                  <div className="t-xs">Last seen 2d ago</div>
                </div>
              </div>
              <button className="pd-btn outline sm" style={{width:'100%'}}>Message via Padee</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({n, l, c, icon}) {
  return (
    <div>
      <div className="tabular" style={{fontSize:22, fontWeight:700, letterSpacing:'-0.4px', color:c, display:'flex', alignItems:'center', gap:4}}>
        {n}{icon}
      </div>
      <div style={{fontSize:10.5, color:'rgba(255,255,255,0.6)', marginTop:1, letterSpacing:'0.04em'}}>{l}</div>
    </div>
  );
}

// Expose
Object.assign(window, { StudentHome, AskPa, TeacherCommand, WorksheetGen, TeacherStudentProfile });
