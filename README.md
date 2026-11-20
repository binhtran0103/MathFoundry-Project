# Instructions
## Prerequisites & Installation

### Verify Node.js Version:
Ensure Node.js v20.0.0 or higher is installed. This project leverages Node's native node:test runner and node:assert/strict module, so no external testing frameworks are required.

`node -v`


### Clone the Repository & Switch Branch:

`git clone <repository-url>`  
`cd MathFoundry-Prj`  
`git checkout test`


### Install Dependencies:

`npm install`


## Running the Test Suite

### 1. Run All Tests

Execute the entire unit and component test suite across the tests/ directory:

`node --test`


(Or via npm if configured in package.json):

`npm test`


### 2. Run Specific Test Files

Run isolated test suites for individual modules:

`node --test tests/problemElements.test.js`

(replace filename with desired test file)

### 3. Run in Watch Mode (Development)

Automatically re-run tests whenever source or test files are modified:

`node --test --watch`
