chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getTables") {
    const tables = Array.from(document.querySelectorAll("table.wikitable"))
    sendResponse({ tables: tables.map((table) => table.outerHTML) })
  } else if (request.action === "downloadTable") {
    const tables = Array.from(document.querySelectorAll("table.wikitable"))
    const tableIndex = request.tableIndex
    const includeUrls = request.includeUrls

    if (tableIndex >= 0 && tableIndex < tables.length) {
      const csvContent = convertTableToCSV(tables[tableIndex], includeUrls)
      const fileNameSuffix = includeUrls ? " - Table" + (tableIndex + 1) + " (with URLs)" : " - Table" + (tableIndex + 1)
      downloadCSV(csvContent, document.title + fileNameSuffix + ".csv")
    }
  }
})

function convertTableToCSV(table, includeUrls) {
  const rows = Array.from(table.querySelectorAll("tr"))
  if (rows.length === 0) {
    return ""
  }

  const finalCsvLines = []

  const sanitize = (text) => {
    // Ensure text is a string, convert null/undefined to empty string
    let cellText = String(text == null ? "" : text).trim().replace(/\s\s+/g, " ")

    // Normalize and remove diacritics
    cellText = cellText.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    // Quote if it contains double quotes, commas, or newlines
    if (cellText.includes('"') || cellText.includes(',') || cellText.includes('\n') || cellText.includes('\r')) {
      cellText = '"' + cellText.replace(/"/g, '""') + '"'
    }
    return cellText
  }

  // Determine which original columns have links (needed for header and data rows)
  const columnHasLink = []
  if (includeUrls && rows[0]) {
    const firstRowCells = Array.from(rows[0].children)
    for (let j = 0; j < firstRowCells.length; j++) {
      let hasLinkInCurrentColumn = false
      for (let i = 0; i < rows.length; i++) {
        const cellsInRow = Array.from(rows[i].children)
        if (cellsInRow[j] && cellsInRow[j].querySelector("a[href]")) {
          hasLinkInCurrentColumn = true
          break
        }
      }
      columnHasLink[j] = hasLinkInCurrentColumn
    }
  }

  // 1. Generate Header Line
  if (rows[0]) {
    const headerLineCells = []
    const firstRowActualCells = Array.from(rows[0].children)
    firstRowActualCells.forEach((cell, cellIndex) => {
      const headerBaseText = String(cell.textContent == null ? "" : cell.textContent)
        .trim()
        .replace(/\s\s+/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

      headerLineCells.push(sanitize(headerBaseText))

      if (includeUrls && columnHasLink[cellIndex]) {
        headerLineCells.push(sanitize(headerBaseText + "_url"))
      }
    })
    if (headerLineCells.length > 0) {
      finalCsvLines.push(headerLineCells.join(","))
    }
  }

  rows.slice(1).forEach((row) => { // Process rows starting from the second one
    const dataLineCells = []
    const currentDataRowCells = Array.from(row.children)
    currentDataRowCells.forEach((cell, cellIndex) => {
      dataLineCells.push(sanitize(cell.textContent)) // Text of the data cell

      if (includeUrls && columnHasLink[cellIndex]) {
        const link = cell.querySelector("a[href]")
        let urlToPush = ""
        if (link) {
          let url = link.getAttribute("href")
          if (url != null) { // Check for null or undefined explicitly
            if (!url.startsWith("http") && !url.startsWith("//")) {
              try {
                url = new URL(url, document.baseURI).href
              } catch (e) {
                // Keep potentially problematic original if new URL() fails
              }
            }
            urlToPush = url
          }
        }
        dataLineCells.push(sanitize(urlToPush))
      }
    })
    if (dataLineCells.length > 0) {
      finalCsvLines.push(dataLineCells.join(","))
    }
  })

  return finalCsvLines.join("\n")
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
