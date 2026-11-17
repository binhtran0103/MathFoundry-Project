import useWorksheetController from './controllers/useWorksheetController.js'
import MathFoundryView from './views/MathFoundryView.jsx'

// Connects the worksheet controller to the main view.
export default function App() {
  const controller = useWorksheetController()
  return <MathFoundryView controller={controller} />
}
