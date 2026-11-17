import Icon from './components/Icon.jsx'
import Cards from './components/Cards.jsx'

// Renders saved work and the browser import action.
export default function UserLibraryView({ controller }) {
  const { profile, saved, navigate, importableCount, busy, importBrowserWork, useTemplate, remove } = controller

  return <><div className="page-heading"><div><div className="eyebrow">YOUR IDEAS, ALL TOGETHER</div><h1>A home for your good work<span>.</span></h1><p>Pick up where you left off. Or make something new.</p></div><button className="primary" onClick={() => navigate('Create worksheet')}><Icon name="plus" size={17}/>Create worksheet</button></div><p className="library-note"><Icon name="folder" size={17}/> {profile ? 'Saved to your account' : 'Saved in this browser'} · {saved.length} {saved.length === 1 ? 'item' : 'items'}</p>{importableCount > 0 && <p><button className="secondary" disabled={busy} onClick={importBrowserWork}>Import browser work ({importableCount})</button></p>}{saved.length ? <Cards onOpen={useTemplate} onRemove={remove} items={saved} library/> : <div className="empty-state"><div className="empty-icon"><Icon name="folder" size={38}/></div><h2>Your next great lesson belongs here.</h2><p>Save a worksheet or problem design from the workshop.<br/>It’ll be ready whenever inspiration strikes again.</p><button className="primary" onClick={() => navigate('Create worksheet')}>Make your first worksheet <Icon name="arrow" size={17}/></button></div>}</>
}
