import { useState } from 'react'

// Renders the form for renaming an operand.
export default function OperandIdForm({ operand, renameOperand }) {
  const [error, setError] = useState('')

  // Applies the new operand label and displays any validation error.
  function submit(event) {
    event.preventDefault()
    try {
      renameOperand(operand.id, new FormData(event.currentTarget).get('operandId'))
      setError('')
    } catch (error) {
      setError(error.message)
    }
  }

  return <form onSubmit={submit} className="operand-id-form">
    <label>Operand ID
      <input name="operandId" defaultValue={operand.value} autoComplete="off"
        spellCheck={false} aria-invalid={Boolean(error)} onChange={() => setError('')}/>
    </label>
    <button className="secondary" type="submit">Apply ID</button>
    {error && <p role="alert" className="error">{error}</p>}
  </form>
}
