// Network Printing (Fallback untuk semua platform)
async function printViaNetwork(text, ip, port = 9100) {
    const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ip, port })
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return true;
}

// AirPrint untuk iOS
function printViaAirPrint(text) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: monospace; padding: 20px; }
                .receipt { max-width: 80mm; margin: 0 auto; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <pre>${text}</pre>
            </div>
            <script>window.print(); setTimeout(() => window.close(), 500);<\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}