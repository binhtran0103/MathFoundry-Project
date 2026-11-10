import useWorksheetController from './controllers/useWorksheetController.js'
import MathFoundryView from './views/MathFoundryView.jsx'

export default function App() {
  const controller = useWorksheetController()
  return <MathFoundryView controller={controller} />
}
