const express = require('express');
const cors = require('cors');
const net = require('net');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

function createPrintData(text) {
    const buffers = [];
    buffers.push(Buffer.from([ESC, 0x40]));        // Initialize
    buffers.push(Buffer.from([ESC, 0x61, 0x01])); // Center align
    buffers.push(Buffer.from([ESC, 0x45, 0x01])); // Bold on
    buffers.push(Buffer.from(text, 'utf-8'));
    buffers.push(Buffer.from([LF, LF, LF]));      // Line feeds
    buffers.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // Cut paper
    return Buffer.concat(buffers);
}

app.post('/api/print', async (req, res) => {
    const { text, ip, port = 9100 } = req.body;
    
    const client = new net.Socket();
    const printData = createPrintData(text);
    
    client.connect(port, ip, () => {
        client.write(printData);
        client.end();
        res.json({ success: true, message: 'Printed successfully' });
    });
    
    client.on('error', (err) => {
        res.status(500).json({ success: false, error: err.message });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});