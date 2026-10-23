# MathFoundry

A React presentation prototype for a teacher-focused custom math worksheet application.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Build with `npm run build`.

## Presentation walkthrough

1. Start on **Overview**, then select **Create worksheet**.
2. Choose addition. Set operand A to random integers between 10 and 99, and operand B to a manual value of 20. The solution is `A + B`.
3. Select **Generate worksheet**. Try changing the problem count to 20 and generating again.
4. Hover over a random operand and click its refresh arrow. Only that number changes. Click a number to edit it manually.
5. Turn on **Answer key**. Print or select **Save as PDF** in the browser print dialog. Turn the answer key off before printing a student copy.
6. Select **Save work**, optionally add it to the demo catalog, and save either a worksheet or problem design.
7. Open **My library**, reopen your work, then explore and search the catalog by keywords or grade.
8. Click the avatar to create a local demo profile.

The quick demo guide is also available in the app sidebar.

## Supported behavior

- Random or fixed operands, numeric ranges and multiples constraints.
- Addition, subtraction, multiplication, division and powers.
- Safe solution expressions with A, B, numbers, parentheses and arithmetic precedence; no executable JavaScript.
- Horizontal, stacked, long-division and radical display treatments. Decorations are visual; the separately entered expression controls the answer.
- 6–30 problems, adaptive font sizes, individual operand edits and rerolls, answer keys and print layout.
- Saved worksheets and reusable problem designs in localStorage.
- Searchable seeded catalog, grade filters, alphabetical or sample popularity sorting, and local public submissions with a basic language filter.

## Prototype boundaries

This is a frontend demo. Profiles do not authenticate users. Saved work and public submissions exist only in this browser and are lost if site storage is cleared. Popularity values are sample data. Production accounts, shared cloud persistence, comprehensive moderation and external PDF indexing are future work. PDF export uses the browser print dialog. The interface uses optional Google Fonts with system fallbacks.
