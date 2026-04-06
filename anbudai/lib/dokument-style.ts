// Professionell dokumentstyle för anbud/offerter
// Används i preview, PDF-export och Word-export

export const DOKUMENT_CSS = `
  * { box-sizing: border-box; }

  .dokument {
    max-width: 780px;
    margin: 0 auto;
    padding: 32px 48px;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 11px;
    line-height: 1.5;
    color: #1a1a2e;
  }

  .dokument h1 {
    font-size: 16px;
    font-weight: 800;
    color: #0E1B2E;
    margin: 0 0 6px 0;
    padding-bottom: 8px;
    border-bottom: 3px solid #F5C400;
    letter-spacing: -0.02em;
  }

  .dokument h2 {
    font-size: 13px;
    font-weight: 700;
    color: #0E1B2E;
    margin: 16px 0 6px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #e0e0e0;
  }

  .dokument h3 {
    font-size: 12px;
    font-weight: 700;
    color: #1E2F45;
    margin: 12px 0 4px 0;
  }

  .dokument p {
    margin: 0 0 6px 0;
  }

  .dokument strong {
    font-weight: 700;
    color: #0E1B2E;
  }

  .dokument em {
    font-style: italic;
    color: #4a5568;
  }

  .dokument ul, .dokument ol {
    margin: 4px 0 8px 0;
    padding-left: 20px;
  }

  .dokument li {
    margin-bottom: 2px;
    padding-left: 2px;
  }

  .dokument li::marker {
    color: #F5C400;
  }

  .dokument hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 12px 0;
  }

  .dokument table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 11px;
  }

  .dokument thead th {
    background: #0E1B2E;
    color: #fff;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.05em;
    padding: 6px 10px;
    text-align: left;
    border: none;
  }

  .dokument thead th:last-child,
  .dokument thead th[style*="text-align:right"],
  .dokument thead th[style*="text-align: right"] {
    text-align: right;
  }

  .dokument tbody td {
    padding: 5px 10px;
    border-bottom: 1px solid #eef0f2;
    vertical-align: top;
  }

  .dokument tbody tr:nth-child(even) {
    background: #f8f9fb;
  }

  .dokument tbody tr:hover {
    background: #f0f4f8;
  }

  .dokument tbody td:last-child {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .dokument tbody td strong {
    font-weight: 700;
  }

  .dokument .summa-rad {
    background: #0E1B2E !important;
    color: #fff;
    font-weight: 700;
  }

  .dokument .summa-rad td {
    border-bottom: none;
    padding: 12px 14px;
  }

  .dokument blockquote {
    margin: 16px 0;
    padding: 12px 20px;
    border-left: 3px solid #F5C400;
    background: #fffdf0;
    color: #4a5568;
    font-size: 13px;
  }

  .dokument a {
    color: #2563eb;
    text-decoration: none;
  }

  .dokument a:hover {
    text-decoration: underline;
  }

  .dokument .header-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e0e0e0;
  }

  .dokument .badge-go {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dokument .badge-go.green { background: #dcfce7; color: #166534; }
  .dokument .badge-go.red { background: #fee2e2; color: #991b1b; }
  .dokument .badge-go.yellow { background: #fef9c3; color: #854d0e; }

  @media print {
    .dokument {
      padding: 0;
      max-width: none;
    }
    .dokument table { page-break-inside: avoid; }
    .dokument h2 { page-break-after: avoid; }
  }
`

export const EXPORT_HTML_HEAD = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>Anbud</title>
<style>${DOKUMENT_CSS}</style>
</head>
<body>
<div class="dokument">`

export const EXPORT_HTML_FOOT = `</div>
</body>
</html>`
