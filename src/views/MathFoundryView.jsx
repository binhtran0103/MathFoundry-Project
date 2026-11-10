import Icon from './components/Icon.jsx'
import Cards from './components/Cards.jsx'
import AccountForm from './components/AccountForm.jsx'
import { symbols, operandSettings } from '../models/worksheet.js'
import { examples } from '../models/catalog.js'
import './styles/App.css'

export default function MathFoundryView({ controller }) {
  const { page, design, setDesign, title, setTitle, count, setCount, problems, answerKey, selectedObject, dragPreview, canvasRef, canvasItems, setExpression, addOperand, addOperator, selectCanvasItem, answers, setAnswers, saved, profile, modal, setModal, notice, search, setSearch, grade, setGrade, sort, setSort, tab, setTab, error, setError, publish, setPublish, step, setStep, help, setHelp, navigate, useTemplate, updateOperandSettings, generateFromCanvas, changeOperand, beginCanvasDrag, beginPaletteDrag, updateSelectedObject, resizeAnswerObject, save, remove, catalog, authenticate, signOut, openAccount, importBrowserWork, importableCount, busy, removeCanvasItem } = controller
  const navItems = [['Overview', 'grid'], ['Create worksheet', 'pen'], ['Explore catalog', 'book'], ['My library', 'folder']]
  function renderProblemEditor() {
    return <div className="problem-builder">
      <div className="expression-card">
        <div><strong>Expression Order</strong><small>Use every operand label and an operator between operands.</small></div>
        <input aria-label="Expression Order" value={design.rule} onChange={event => setExpression(event.target.value)} placeholder="A + B + C"/>
      </div>
      <div className="builder-section-label">PROBLEM CANVAS</div>
      <p className="canvas-help">Add an operand, then choose an operator for the gap or drag it into place. Select an object to edit it.</p>
      <div className="canvas-scroll" role="region" aria-label="Problem canvas" tabIndex={0}>
        <div ref={canvasRef} className="problem-canvas freeform-canvas" style={{ width: design.canvasWidth }}>
          {canvasItems.map(item => <button
            key={item.id}
            className={'canvas-object ' + item.type + '-object' + (selectedObject === item.id ? ' selected' : '')}
            style={{ left: item.x + '%', top: item.y + '%', width: item.width, height: item.height }}
            aria-label={item.type === 'operand' ? 'Operand ' + item.value : item.type === 'operator' ? 'Operator ' + item.label : item.label}
            aria-pressed={selectedObject === item.id}
            data-canvas-id={item.id}
            onPointerDown={event => beginCanvasDrag(event, item)}
            onClick={event => { if (event.detail === 0) selectCanvasItem(item.id) }}
            onContextMenu={event => { event.preventDefault(); removeCanvasItem(item.id) }}
          >
            {item.type === 'bar' ? null : item.label}
            {item.type === 'operand' && <small>Operand</small>}
          </button>)}
        </div>
      </div>
      <div className="builder-palette">
        <button className="add-operand" onClick={addOperand}><Icon name="plus" size={16}/>Add operand</button>
        {Object.entries(symbols).map(([operator, symbol]) => <button
          key={operator}
          aria-label={'Place operator ' + symbol}
          onClick={() => addOperator(operator)}
          onPointerDown={event => beginPaletteDrag(event, 'operator:' + operator)}
        >{symbol}<small>Operator</small></button>)}
        {Object.entries({ horizontal: 'Horizontal', vertical: 'Stacked', division: 'Long division', radical: 'Radical' })
          .map(([style, label]) => <button key={style} onPointerDown={event => beginPaletteDrag(event, 'style:' + style)}>{label}<small>Style</small></button>)}
        <button onPointerDown={event => beginPaletteDrag(event, 'answer:Answer')}>Answer<small>Blank space</small></button>
        <button onPointerDown={event => beginPaletteDrag(event, 'bar:—')}>Horizontal bar<small>Divider</small></button>
      </div>
      {dragPreview && <div className="canvas-drag-ghost" style={{ left: dragPreview.x, top: dragPreview.y }}>{dragPreview.label}</div>}
    </div>
  }
  function renderWorksheetProblem(problem, index) {
    const layout = problem.layout
    const items = Array.isArray(layout) ? layout : layout.items || canvasItems
    const sourceWidth = Array.isArray(layout) ? 700 : layout.canvasWidth || 700
    const sourceHeight = Array.isArray(layout) ? 420 : layout.canvasHeight || 420
    const objects = items.filter(item => item.type === 'operand' || item.type === 'operator' || item.type === 'answer' || item.type === 'bar').map(item => ({
      ...item,
      sourceWidth: ['answer','bar'].includes(item.type) ? item.width || (item.type === 'bar' ? 160 : 120) : item.type === 'operand' ? 72 : 48,
      sourceHeight: ['answer','bar'].includes(item.type) ? item.height || (item.type === 'bar' ? 4 : 56) : item.type === 'operand' ? 48 : 48,
      centerX: item.x * sourceWidth / 100,
      centerY: item.y * sourceHeight / 100,
    }))
    const { minX, maxX, minY, maxY } = objects.reduce((bounds, item) => ({
      minX: Math.min(bounds.minX, item.centerX - item.sourceWidth / 2),
      maxX: Math.max(bounds.maxX, item.centerX + item.sourceWidth / 2),
      minY: Math.min(bounds.minY, item.centerY - item.sourceHeight / 2),
      maxY: Math.max(bounds.maxY, item.centerY + item.sourceHeight / 2),
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
    const sceneWidth = Math.max(1, maxX - minX)
    const sceneHeight = Math.max(1, maxY - minY)
    const { values } = problem
    return <div className={`problem ${design.style}`} key={index}><span className="problem-number">{String(index+1).padStart(2,'0')}</span><div className="snapshot-viewport"><div className="problem-layout-snapshot" style={{ '--scene-ratio': `${sceneWidth} / ${sceneHeight}` }}>{objects.map(item => {
      const position = { left: `${(item.centerX - minX) / sceneWidth * 100}%`, top: `${(item.centerY - minY) / sceneHeight * 100}%`, width: `${item.sourceWidth / sceneWidth * 100}%`, height: `${item.sourceHeight / sceneHeight * 100}%`, '--token-font-size': `${18 / sceneWidth * 100}cqw` }
      return item.type === 'operand'
        ? <div key={item.id} className="snapshot-token snapshot-operand" style={{ ...position, '--width-font': `${150 / Math.max(1, String(values[item.value] ?? '').length)}cqw` }}><input aria-label={`Problem ${index+1} operand ${item.value}`} type="number" value={values[item.value] ?? ''} onChange={e => changeOperand(index,item.value,e.target.value)}/>{operandSettings(design,item.value)?.mode === 'random' && <button title={`Reroll operand ${item.value}`} onClick={() => changeOperand(index,item.value)}><Icon name="refresh" size={11}/></button>}</div>
        : item.type === 'operator'
          ? <span key={item.id} className="snapshot-token snapshot-operator" style={position}><span className="snapshot-operator-glyph">{symbols[item.value] || item.value}</span></span>
          : item.type === 'answer'
            ? <div key={item.id} className="snapshot-token snapshot-answer-space" style={position}>{answerKey?.answerAt(index) ?? ''}</div>
            : <div key={item.id} className="snapshot-token snapshot-bar" style={position}/>
    })}</div></div></div>
  }
  function renderOperandSettings({ id, value: name, constraint: config }) {
    return <div className="operand-settings active-operand"><div className="operand-header"><strong><span>{name}</span> Operand {name}</strong><select aria-label={`Operand ${name} generation mode`} value={config.mode} onChange={e => updateOperandSettings(id,{ mode:e.target.value })}><option value="random">Random</option><option value="fixed">Manual</option></select></div>{config.mode === 'fixed' ? <label>Value<input type="number" value={config.value} onChange={e => updateOperandSettings(id,{ value:e.target.value })}/></label> : <><div className="input-row"><label>Minimum<input type="number" value={config.min} onChange={e => updateOperandSettings(id,{ min:e.target.value })}/></label><label>Maximum<input type="number" value={config.max} onChange={e => updateOperandSettings(id,{ max:e.target.value })}/></label></div><label>Number constraint<select value={config.multiple} onChange={e => updateOperandSettings(id,{ multiple:Number(e.target.value) })}><option value={1}>Any integer</option><option value={10}>Multiples of 10</option><option value={100}>Multiples of 100</option><option value={5}>Multiples of 5</option><option value={12}>Multiples of 12</option></select></label></>}</div>
  }
  function renderSelectedObjectSettings() {
    const item = canvasItems.find(object => object.id === selectedObject)
    if (!item) return <p className="selection-hint">Select one canvas object to edit its settings.</p>
    if (item.type === 'operand') return renderOperandSettings(item)
    if (item.type === 'operator') return <label>Operator<select value={item.value} onChange={e => updateSelectedObject(e.target.value)}>{Object.entries(symbols).map(([operator,symbol]) => <option key={operator} value={operator}>{symbol}</option>)}</select></label>
    if (item.type === 'answer') return <><p className="selection-hint">This box becomes blank writing space on the worksheet.</p><div className="input-row"><label>Width<input aria-label="Answer space width" type="number" min="40" max="600" value={item.width} onChange={e => resizeAnswerObject('width',e.target.value)}/></label><label>Height<input aria-label="Answer space height" type="number" min="40" max="400" value={item.height} onChange={e => resizeAnswerObject('height',e.target.value)}/></label></div></>
    if (item.type === 'bar') return <><p className="selection-hint">A visual divider only; it does not affect the expression.</p><label>Bar width<input aria-label="Divider width" type="number" min="40" max="600" value={item.width} onChange={e => resizeAnswerObject('width',e.target.value)}/></label></>
    return <label>Display style<select value={item.value} onChange={e => updateSelectedObject(e.target.value)}>{[['horizontal','Horizontal'],['vertical','Stacked'],['division','Long division'],['radical','Radical']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
  }
  const worksheetColumns = problems.length <= 8 ? 2 : problems.length <= 16 ? 3 : problems.length <= 24 ? 4 : 5
  const worksheetRows = Math.ceil(problems.length / worksheetColumns)
  const worksheetFontSize = Math.max(9, Math.min(19, 24 - worksheetRows * 1.25))
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('Overview') }}><span className="brand-mark">m<span>ƒ</span></span><span>MathFoundry<span className="brand-dot">.</span></span></a><div className="workspace-label">TEACHER WORKSPACE</div><nav>{navItems.map(([label, icon]) => <button className={page === label ? 'nav-item active' : 'nav-item'} key={label} onClick={() => navigate(label)}><Icon name={icon}/>{label}{label === 'My library' && <span className="nav-count">{saved.length}</span>}</button>)}</nav><div className="sidebar-note"><span className="little-spark">✦</span><h3>Less prep.<br/>More possibilities.</h3><p>A little inspiration for your next great lesson.</p><button onClick={() => navigate('Explore catalog')}>Find your next worksheet <Icon name="arrow" size={16}/></button></div><div className="sidebar-bottom"><button className="nav-item" onClick={() => setHelp(true)}><span className="help-icon">?</span>Quick guide</button><button className="profile" onClick={openAccount}><span className="avatar">{profile?.name?.slice(0,1).toUpperCase() || 'T'}</span><span><strong>{profile?.name || 'Teacher workspace'}</strong><small>{profile ? 'Manage account' : 'Sign in or create an account'}</small></span><Icon name="chevron" size={16}/></button></div></aside>
    <div className="main-shell"><header className="topbar"><div><span className="breadcrumb">Workspace</span><Icon name="chevron" size={13}/><span>{page}</span></div><div><button className="avatar small" onClick={openAccount} aria-label="Open account">{profile?.name?.slice(0,1).toUpperCase() || 'T'}</button></div></header>
    <main>
    {page === 'Overview' && <>
      <div className="page-heading"><div><div className="eyebrow">A FRESH PAGE STARTS HERE</div><h1>Good lessons start with you<span>.</span></h1><p>Turn your teaching ideas into worksheets that just click.</p></div><button className="primary" onClick={() => { navigate('Create worksheet'); setStep('design') }}><Icon name="plus" size={18}/>Create worksheet</button></div>
      <section className="hero-banner"><div className="hero-copy"><span className="pill"><span>✦</span> MADE FOR YOUR CLASSROOM</span><h2>Your lesson.<br/>Your numbers.<br/><em>Your worksheet.</em></h2><p>Design the problems. Set the possibilities.<br/>We’ll take care of the practice.</p><button className="primary" onClick={() => { navigate('Create worksheet'); setStep('design') }}>Let’s make something <Icon name="arrow" size={18}/></button><small>No blank-page feeling required.</small></div><div className="hero-art" aria-hidden="true"><span className="art-star">✳</span><span className="float-symbol plus-symbol">+</span><div className="hero-paper"><div className="paper-top"><span>MATHFOUNDRY / PRACTICE SERIES</span><span>№ 01</span></div><h3>A little practice.<br/>A lot of possibility.</h3><div className="paper-sub">Name __________________  Date __________</div><div className="hero-sums"><span><small>01</small>24 + 18 = <i/></span><span><small>02</small>36 + 27 = <i/></span><span><small>03</small>52 + 16 = <i/></span><span><small>04</small>43 + 29 = <i/></span><span><small>05</small>65 + 12 = <i/></span><span><small>06</small>17 + 34 = <i/></span></div><div className="paper-foot">Big ideas begin with small steps. <span>✦</span></div></div><div className="floating-tag"><span className="check-circle"><Icon name="check" size={14}/></span> A perfect fit for your lesson</div><span className="float-symbol divide-symbol">÷</span></div></section>
      <section className="workflow-strip">{[['pen','Design your way','Custom problems. Your rules.'],['refresh','Make every sheet unique','Smart numbers, fresh practice.'],['book','Share a little inspiration','A whole community of ideas.']].map(([icon, name, desc],i) => <div key={name}><span className={`feature-icon feature-${i}`}><Icon name={icon}/></span><div><h3>{name}</h3><p>{desc}</p></div>{i < 2 && <span className="feature-divider"/>}</div>)}</section>
      <section className="featured"><div className="section-heading"><div><div className="eyebrow">A LITTLE INSPIRATION</div><h2>Ready for your next lesson</h2><p>Start with a community favorite. Make it your own.</p></div><button className="text-button" onClick={() => navigate('Explore catalog')}>Explore the catalog <Icon name="arrow" size={17}/></button></div><Cards onOpen={useTemplate} onRemove={remove} items={examples.slice(0,3)}/></section>
      <div className="bottom-note"><span>✦</span> Thoughtfully made for the people who make a difference.</div>
    </>}
    {page === 'Create worksheet' && <>
      <div className="page-heading"><div><div className="eyebrow">FROM IDEA TO HANDOUT</div><h1>Your worksheet workshop<span>.</span></h1><p>A little structure. Endless possibilities.</p></div><button className="secondary" onClick={() => { setModal('save'); setError('') }}><Icon name="save" size={17}/>Save work</button></div>
      <div className="builder-tabs"><button className={step === 'design' ? 'selected' : ''} onClick={() => setStep('design')}><b>1</b> Design a problem</button><span>────</span><button className={step === 'worksheet' ? 'selected' : ''} onClick={() => setStep('worksheet')}><b>2</b> Make your worksheet</button><span className="auto-save-note">Your ideas, made printable.</span></div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className={`builder-layout ${step === 'design' ? 'design-mode' : 'worksheet-mode'}`}><section className="settings-panel"><div className="panel-heading"><Icon name="pen"/><h2>{step === 'design' ? 'Problem designer' : 'Worksheet settings'}</h2></div>
      <label>Worksheet title<input value={title} maxLength={80} onChange={e => setTitle(e.target.value)}/></label>
      {step === 'design' ? <>
      

      <div className="selected-object-card"><div className="builder-section-label">SELECTED OBJECT</div>{renderSelectedObjectSettings()}{selectedObject && <button className="text-button" onClick={() => removeCanvasItem(selectedObject)}>Remove selected object</button>}</div>
      </> : <><label>Operand font<select value={design.operandFont || 'mono'} onChange={e => setDesign({operandFont:e.target.value})}><option value="mono">Terminal Mono</option><option value="courier">Courier</option><option value="console">Lucida Console</option><option value="serif">Book Serif</option><option value="sans">Clean Sans</option></select></label><div className="input-row"><label>Problems<select value={count} onChange={e => setCount(Number(e.target.value))}>{[6,8,12,16,20,24,30].map(n => <option key={n} value={n}>{n} problems</option>)}</select></label><label>Grade level<select value={design.grade} onChange={e => setDesign({grade:e.target.value})}>{[1,2,3,4,5,6,7,8].map(n => <option key={n}>Grade {n}</option>)}</select></label></div><label>Keywords<input value={design.tags} onChange={e => setDesign({tags:e.target.value})}/></label><button className="secondary full" onClick={generateFromCanvas}><Icon name="refresh" size={17}/>Generate fresh problems</button><div className="toggle-row"><div><strong>Answer key</strong><small>Include solutions on the sheet</small></div><button role="switch" aria-checked={answers} aria-label="Show answer key" className={`toggle ${answers ? 'on' : ''}`} onClick={() => setAnswers(!answers)}><span/></button></div><div className="instruction"><span>✦</span><p>Click a number to edit it. Use its refresh arrow to reroll just that operand.</p></div><button className="primary full" onClick={() => window.print()}><Icon name="print" size={17}/>Print / Save as PDF</button><button className="text-button full" onClick={() => setStep('design')}>Edit problem design <Icon name="arrow" size={16}/></button></>}
      </section><section className={`preview-panel ${step === 'design' ? 'editor-stage' : 'worksheet-stage'}`}>{step === 'design' ? <><div className="preview-toolbar"><span><i/>PROBLEM EDITOR</span><span>Drag to arrange · overlaps are blocked</span></div>{renderProblemEditor()}</> : <><div className="preview-toolbar"><span><i/>LIVE PREVIEW</span><span>{problems.length} problems · Letter 8.5 × 11 in</span></div><div className={`worksheet operand-font-${design.operandFont || 'mono'}`} style={{'--problem-font': `${worksheetFontSize}px`, '--problem-rows': worksheetRows, '--problem-columns': worksheetColumns}}><div className="worksheet-brand">MATHFOUNDRY <span>{design.grade} · PRACTICE SERIES</span></div><h2>{title || 'Untitled worksheet'}</h2><p className="worksheet-instruction">{answers ? 'Answer key • Solutions shown below' : 'Take your time. Show your thinking. You’ve got this.'}</p><div className="student-line">Name <span/> Date <span/></div><div className={`worksheet-problems ${worksheetColumns > 2 ? 'three-columns' : ''}`}>{problems.map(renderWorksheetProblem)}</div><div className="worksheet-footer"><span>Small steps. Big discoveries.</span><span>MathFoundry · 1</span></div></div><div className="preview-caption"><Icon name="check" size={15}/>Worksheet problems are generated from your reusable problem design.</div></>}</section></div>
    </>}
    {page === 'Explore catalog' && <><div className="page-heading"><div><div className="eyebrow">GOOD IDEAS ARE BETTER SHARED</div><h1>A little inspiration for every lesson<span>.</span></h1><p>Explore ready-to-use practice, then add your own teaching touch.</p></div></div><div className="catalog-controls"><div className="search-box"><Icon name="search"/><input placeholder="Search skills, topics, or keywords…" aria-label="Search catalog" value={search} onChange={e => setSearch(e.target.value)}/></div><select aria-label="Filter by grade" value={grade} onChange={e => setGrade(e.target.value)}><option>All grades</option>{[1,2,3,4,5,6,7,8].map(n => <option key={n}>Grade {n}</option>)}</select><select aria-label="Sort catalog" value={sort} onChange={e => setSort(e.target.value)}><option value="popular">Most popular</option><option value="name">Name: A–Z</option></select></div><div className="catalog-tabs">{['Worksheets','Problem designs'].map(name => <button key={name} className={tab === name ? 'selected' : ''} onClick={() => setTab(name)}>{name}</button>)}<span>{catalog.length} results</span></div><p className="demo-disclosure">Popularity counts for sample worksheets are illustrative.</p>{catalog.length ? <Cards onOpen={useTemplate} onRemove={remove} items={catalog}/> : <div className="empty-state"><Icon name="search" size={34}/><h2>No matches just yet</h2><p>Try another keyword or grade level.</p><button className="secondary" onClick={() => { setSearch(''); setGrade('All grades') }}>Clear filters</button></div>}</>}
    {page === 'My library' && <><div className="page-heading"><div><div className="eyebrow">YOUR IDEAS, ALL TOGETHER</div><h1>A home for your good work<span>.</span></h1><p>Pick up where you left off. Or make something new.</p></div><button className="primary" onClick={() => navigate('Create worksheet')}><Icon name="plus" size={17}/>Create worksheet</button></div><p className="library-note"><Icon name="folder" size={17}/> {profile ? 'Saved to your account' : 'Saved in this browser'} · {saved.length} {saved.length === 1 ? 'item' : 'items'}</p>{importableCount > 0 && <p><button className="secondary" disabled={busy} onClick={importBrowserWork}>Import browser work ({importableCount})</button></p>}{saved.length ? <Cards onOpen={useTemplate} onRemove={remove} items={saved} library/> : <div className="empty-state"><div className="empty-icon"><Icon name="folder" size={38}/></div><h2>Your next great lesson belongs here.</h2><p>Save a worksheet or problem design from the workshop.<br/>It’ll be ready whenever inspiration strikes again.</p><button className="primary" onClick={() => navigate('Create worksheet')}>Make your first worksheet <Icon name="arrow" size={17}/></button></div>}</>}
    {page === 'Create worksheet' && step === 'design' && <div className="generate-dock"><button className="primary" onClick={generateFromCanvas}>Generate worksheet <Icon name="arrow" size={17}/></button></div>}</main><footer className="app-footer"><span>MathFoundry<span className="brand-dot">.</span> <span className="footer-tag">Made for the way you teach.</span></span></footer></div>
    {notice && <div className="toast" role="status"><Icon name="check" size={18}/>{notice}</div>}
    {(modal || help) && <div className="modal-backdrop" onClick={() => { setModal(null); setHelp(false) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}><button className="modal-close" aria-label="Close dialog" onClick={() => { setModal(null); setHelp(false) }}><Icon name="close"/></button>{help ? <><h2 id="modal-title">Getting started with MathFoundry</h2><ol className="demo-steps"><li><strong>Start with an idea.</strong> Open the workshop or choose a catalog template.</li><li><strong>Make it yours.</strong> Set operand ranges, choose an operation, and define the solution.</li><li><strong>Generate and fine-tune.</strong> Reroll one number, manually edit another, and reveal the answers.</li><li><strong>Keep and share.</strong> Save to your library or publish to the shared catalog.</li><li><strong>Bring it to class.</strong> Print the worksheet or choose “Save as PDF” in the print dialog.</li></ol></> : modal === 'profile' ? <AccountForm profile={profile} busy={busy} error={error} clearError={() => setError('')} authenticate={authenticate} signOut={signOut}/> : <><div className="eyebrow">KEEP THE GOOD IDEAS</div><h2 id="modal-title">Save it for your next lesson.</h2><p className="modal-intro">“{title}” will be saved {profile ? 'to your account' : 'in this browser'}.</p>{profile ? <label className="checkbox-row"><input type="checkbox" disabled={busy} checked={publish} onChange={e => setPublish(e.target.checked)}/><span>Publish to the public catalog<small>Includes a basic classroom-language filter.</small></span></label> : <button className="text-button" disabled={busy} onClick={openAccount}>Sign in to publish to the catalog</button>}{error && <div className="error" role="alert">{error}</div>}<div className="save-options"><button className="primary" disabled={busy} onClick={() => save('Worksheet')}><Icon name="save" size={17}/>Save worksheet</button><button className="secondary" disabled={busy} onClick={() => save('Problem design')}>Save problem design</button></div></>}</section></div>}
  </div>
}
