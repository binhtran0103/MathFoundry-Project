# MathFoundry

A worksheet builder for teachers, with a shared catalog and personal libraries.

## Run locally

Use Node.js 22.13 or later on the Node.js 22 line, or a newer Node.js release supported by Vite.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Vite runs the React app and SQLite API together. To check the built app locally, run `npm run build` followed by `npm run preview`.

## Worksheet walkthrough

1. Start on **Overview**, then select **Create worksheet**.
2. Start with `A + B`. Select each operand to set its own range or fixed value. Select **Add operand** to append another, then click an operator to fill the gap or drag it into place. The canvas scrolls horizontally as it grows.
3. Select **Generate worksheet**. Try changing the problem count to 20 and generating again.
4. Hover over a random operand and click its refresh arrow. Only that number changes. Click a number to edit it manually.
5. Turn on **Answer key**. Print or select **Save as PDF** in the browser print dialog. Turn the answer key off before printing a student copy.
6. Select **Save work** and save either a worksheet or a problem design. Sign in to publish to the shared catalog.
7. Open **My library**, reopen your work, then explore and search the catalog by keywords or grade.
8. Open the account menu to create an account or sign in. If you have existing browser saves, open **My library** and select **Import browser work** to copy them into your private account library. The browser copies remain available when signed out.

The quick guide is also available in the app sidebar.

## Supported behavior

- Random or fixed operands, numeric ranges and multiples constraints.
- Addition, subtraction, multiplication, division and powers.
- Safe solution expressions with operand labels such as A, Z, and AA, numbers, parentheses, and arithmetic precedence. There is no fixed operand count in the editor.
- Horizontal, stacked, long-division and radical display treatments. Decorations are visual; the separately entered expression controls the answer.
- 6–30 problems, adaptive font sizes, individual operand edits and rerolls, answer keys and print layout.
- SQLite-backed accounts, sessions, worksheets, and reusable problem designs. Guests can save work in their browser.
- Searchable shared catalog with seeded examples, grade filters, alphabetical or sample popularity sorting, and a basic language filter for new public submissions.

## SQLite storage

The API creates `.mathfoundry/mathfoundry.sqlite` and initializes the schema on first start. Set `MATHFOUNDRY_DB` to choose another database path outside the public and build directories. Docker Compose stores the database in the `mathfoundry-data` named volume.

Accounts use an email address and password. SQLite stores salted password hashes and hashed session tokens. If running behind HTTPS, set `MATHFOUNDRY_ORIGIN` to the external origin (for example, `https://mathfoundry.example`) so the API validates that origin and issues Secure session cookies.

Work saved to an account is private by default. Publishing adds a copy of the saved work to the shared catalog. Removing a published item from your library leaves its catalog entry available. Browser-only catalog submissions from earlier versions remain visible in their original browser.
