chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getTables") {
    const tables = Array.from(document.querySelectorAll("table.wikitable"))
    sendResponse({ tables: tables.map((table) => table.outerHTML) })
  } else if (request.action === "downloadTable") {
    const tables = Array.from(document.querySelectorAll("table.wikitable"))
    const tableIndex = request.tableIndex

    if (tableIndex >= 0 && tableIndex < tables.length) {
      const csvContent = convertTableToCSV(tables[tableIndex])
      downloadCSV(csvContent, document.title + " - Table" + (tableIndex + 1) + ".csv")
    }
  }
})

function convertTableToCSV(table) {
  const rows = Array.from(table.querySelectorAll("tr"))
  const csvData = []

  rows.forEach((row) => {
    const rowData = []
    Array.from(row.children).forEach((cell) => {
      let cellText = cell.textContent.trim().replace(/\s\s+/g, " ")
      cellText = cellText.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      if (cellText.includes('"') || cellText.includes(',') || cellText.includes('\n')) {
        cellText = '"' + cellText.replace(/"/g, '""') + '"'
      }
      rowData.push(cellText)
    })
    csvData.push(rowData.join(","))
  })

  return csvData.join("\n")
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
