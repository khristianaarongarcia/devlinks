const express = require('express');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const forge = require('node-forge');
const Database = require('better-sqlite3');

const app = express();

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'product_codes.db'));

// Create tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS order_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_sku TEXT UNIQUE,
        product_name TEXT,
        order_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS scanned_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_number TEXT,
        courier TEXT,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tracking_number)
    );
`);

// Prepared statements for performance
const getOrderCode = db.prepare('SELECT order_code FROM order_codes WHERE parent_sku = ?');
const insertOrderCode = db.prepare('INSERT OR REPLACE INTO order_codes (parent_sku, product_name, order_code) VALUES (?, ?, ?)');
const getAllOrderCodes = db.prepare('SELECT * FROM order_codes ORDER BY created_at DESC');

const insertScannedOrder = db.prepare('INSERT OR IGNORE INTO scanned_orders (tracking_number, courier) VALUES (?, ?)');
const getScannedOrders = db.prepare('SELECT tracking_number FROM scanned_orders WHERE courier = ?');
const isAlreadyScanned = db.prepare('SELECT 1 FROM scanned_orders WHERE tracking_number = ?');
const clearScannedOrders = db.prepare('DELETE FROM scanned_orders');
const getScannedCount = db.prepare('SELECT courier, COUNT(*) as count FROM scanned_orders GROUP BY courier');
const getAllScannedTracking = db.prepare('SELECT tracking_number FROM scanned_orders');

// Generate self-signed certificate for HTTPS (needed for camera access on phone)
function generateCertificate() {
    const certPath = path.join(__dirname, 'cert.pem');
    const keyPath = path.join(__dirname, 'key.pem');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
    }

    console.log('Generating SSL certificate...');
    
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    const attrs = [
        { name: 'commonName', value: 'localhost' },
        { name: 'organizationName', value: 'SPX Product Searcher' }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
    const pemCert = forge.pki.certificateToPem(cert);
    
    fs.writeFileSync(keyPath, pemKey);
    fs.writeFileSync(certPath, pemCert);
    
    return { key: pemKey, cert: pemCert };
}

const sslOptions = generateCertificate();

const httpServer = http.createServer(app);
const httpsServer = https.createServer(sslOptions, app);

const io = socketIo(httpsServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const ioHttp = socketIo(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const EXCEL_FOLDER = path.join(__dirname, 'excel_files');
const DOWNLOADS_FOLDER = path.join(require('os').homedir(), 'Downloads');

if (!fs.existsSync(EXCEL_FOLDER)) {
    fs.mkdirSync(EXCEL_FOLDER);
    console.log('Created excel_files folder. Please place your Excel files there.');
}

// Watch Downloads folder for new Excel files and copy them automatically
let downloadsWatchDebounce = null;
const copiedFiles = new Set(); // Track recently copied files to avoid duplicates

function copyExcelFromDownloads(filename) {
    const sourcePath = path.join(DOWNLOADS_FOLDER, filename);
    const destPath = path.join(EXCEL_FOLDER, filename);
    
    // Check if file already exists or was recently copied
    if (copiedFiles.has(filename)) return;
    
    try {
        // Check if source exists and is a file
        const stats = fs.statSync(sourcePath);
        if (!stats.isFile()) return;
        
        // Copy the file
        fs.copyFileSync(sourcePath, destPath);
        copiedFiles.add(filename);
        console.log(`Auto-copied from Downloads: ${filename}`);
        
        // Remove from tracked set after 5 seconds to allow re-copying if needed
        setTimeout(() => copiedFiles.delete(filename), 5000);
        
        // Notify clients
        setTimeout(() => {
            const files = getLoadedFiles();
            const stats = getCourierStats();
            if (io) {
                io.emit('files-loaded', files);
                io.emit('courier-stats', stats);
            }
            if (ioHttp) {
                ioHttp.emit('files-loaded', files);
                ioHttp.emit('courier-stats', stats);
            }
        }, 500);
    } catch (err) {
        // File might be still being written, ignore
    }
}

// Watch Downloads folder
try {
    fs.watch(DOWNLOADS_FOLDER, (eventType, filename) => {
        if (filename && (filename.endsWith('.xlsx') || filename.endsWith('.xls'))) {
            clearTimeout(downloadsWatchDebounce);
            downloadsWatchDebounce = setTimeout(() => {
                copyExcelFromDownloads(filename);
            }, 1000); // Wait 1 second for file to finish downloading
        }
    });
    console.log(`Watching Downloads folder: ${DOWNLOADS_FOLDER}`);
} catch (err) {
    console.log('Could not watch Downloads folder:', err.message);
}

// Watch for file changes
let fileWatchDebounce = null;
fs.watch(EXCEL_FOLDER, (eventType, filename) => {
    if (filename && (filename.endsWith('.xlsx') || filename.endsWith('.xls'))) {
        clearTimeout(fileWatchDebounce);
        fileWatchDebounce = setTimeout(() => {
            const files = getLoadedFiles();
            console.log(`File change detected: ${filename} - Total files: ${files.length}`);
            const stats = getCourierStats();
            if (io) {
                io.emit('files-loaded', files);
                io.emit('courier-stats', stats);
            }
            if (ioHttp) {
                ioHttp.emit('files-loaded', files);
                ioHttp.emit('courier-stats', stats);
            }
        }, 500);
    }
});

// Column keyword mappings
const COLUMN_KEYWORDS = {
    orderId: ['order id', 'orderid', 'order_id', 'order no', 'order number'],
    trackingNumber: ['tracking number', 'tracking no', 'tracking', 'tracking_number', 'awb', 'waybill'],
    productName: ['product name', 'productname', 'product_name', 'item name', 'item', 'product'],
    parentSku: ['parent sku', 'sku reference', 'sku ref', 'parent_sku', 'sku'],
    variationName: ['variation name', 'variation', 'variant', 'option'],
    quantity: ['quantity', 'qty', 'quantity ordered'],
    dealPrice: ['deal price', 'price', 'unit price', 'selling price'],
    username: ['username', 'buyer', 'customer', 'username (buyer)'],
    receiverName: ['receiver name', 'recipient', 'receiver', 'ship to name'],
    phoneNumber: ['phone number', 'phone', 'contact', 'mobile', 'tel'],
    deliveryAddress: ['delivery address', 'address', 'shipping address', 'ship to address'],
    skuWeight: ['sku total weight', 'weight', 'total weight', 'item weight'],
    shippingCourier: ['shipping option', 'courier', 'shipping', 'carrier', 'logistics', 'shipment method']
};

function findColumn(headers, keywords) {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    for (const keyword of keywords) {
        for (let i = 0; i < lowerHeaders.length; i++) {
            if (lowerHeaders[i].includes(keyword)) {
                return headers[i];
            }
        }
    }
    return null;
}

// Get courier statistics from all Excel files
function getCourierStats() {
    const courierCounts = {};
    const scannedByCourer = {};
    
    try {
        // Get scanned counts
        const scannedRows = getScannedCount.all();
        for (const row of scannedRows) {
            scannedByCourer[row.courier] = row.count;
        }
        
        const files = fs.readdirSync(EXCEL_FOLDER).filter(file => 
            file.endsWith('.xlsx') || file.endsWith('.xls')
        );

        const seenTrackingNumbers = {};

        for (const file of files) {
            const filePath = path.join(EXCEL_FOLDER, file);
            try {
                const workbook = XLSX.readFile(filePath);
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(sheet);
                    if (data.length === 0) continue;
                    
                    const headers = Object.keys(data[0]);
                    const courierCol = findColumn(headers, COLUMN_KEYWORDS.shippingCourier);
                    const trackingCol = findColumn(headers, COLUMN_KEYWORDS.trackingNumber);
                    
                    if (!courierCol || !trackingCol) continue;
                    
                    for (const row of data) {
                        const courier = String(row[courierCol] || '').trim();
                        const tracking = String(row[trackingCol] || '').trim();
                        
                        if (courier && tracking) {
                            // Only count unique tracking numbers per courier
                            const key = `${courier}-${tracking}`;
                            if (!seenTrackingNumbers[key]) {
                                seenTrackingNumbers[key] = true;
                                courierCounts[courier] = (courierCounts[courier] || 0) + 1;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`Error reading file ${file}:`, err.message);
            }
        }
        
        // Format results
        const results = Object.keys(courierCounts).map(courier => ({
            courier,
            total: courierCounts[courier],
            scanned: scannedByCourer[courier] || 0
        }));
        
        return results.sort((a, b) => b.total - a.total);
    } catch (err) {
        console.error('Error getting courier stats:', err.message);
        return [];
    }
}

// Search for tracking number
function searchTrackingNumber(trackingNumber) {
    const results = [];
    
    try {
        const files = fs.readdirSync(EXCEL_FOLDER).filter(file => 
            file.endsWith('.xlsx') || file.endsWith('.xls')
        );

        if (files.length === 0) {
            return { error: 'No Excel files found in excel_files folder', results: [], courierStats: [] };
        }

        for (const file of files) {
            const filePath = path.join(EXCEL_FOLDER, file);
            
            try {
                const workbook = XLSX.readFile(filePath);
                
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(sheet);
                    
                    if (data.length === 0) continue;
                    
                    const headers = Object.keys(data[0]);
                    
                    const columns = {
                        orderId: findColumn(headers, COLUMN_KEYWORDS.orderId),
                        trackingNumber: findColumn(headers, COLUMN_KEYWORDS.trackingNumber),
                        productName: findColumn(headers, COLUMN_KEYWORDS.productName),
                        parentSku: findColumn(headers, COLUMN_KEYWORDS.parentSku),
                        variationName: findColumn(headers, COLUMN_KEYWORDS.variationName),
                        quantity: findColumn(headers, COLUMN_KEYWORDS.quantity),
                        dealPrice: findColumn(headers, COLUMN_KEYWORDS.dealPrice),
                        username: findColumn(headers, COLUMN_KEYWORDS.username),
                        receiverName: findColumn(headers, COLUMN_KEYWORDS.receiverName),
                        phoneNumber: findColumn(headers, COLUMN_KEYWORDS.phoneNumber),
                        deliveryAddress: findColumn(headers, COLUMN_KEYWORDS.deliveryAddress),
                        skuWeight: findColumn(headers, COLUMN_KEYWORDS.skuWeight),
                        shippingCourier: findColumn(headers, COLUMN_KEYWORDS.shippingCourier)
                    };
                    
                    if (!columns.trackingNumber) continue;
                    
                    for (const row of data) {
                        const rowTracking = String(row[columns.trackingNumber] || '').trim();
                        
                        if (rowTracking.toLowerCase() === trackingNumber.toLowerCase()) {
                            const parentSku = row[columns.parentSku] || 'N/A';
                            const productName = row[columns.productName] || 'N/A';
                            const quantity = row[columns.quantity] || 1;
                            const courier = row[columns.shippingCourier] || 'Unknown';
                            
                            // Get order code from database
                            const orderCodeRow = getOrderCode.get(parentSku);
                            let orderCode = orderCodeRow ? orderCodeRow.order_code : null;
                            
                            // Check if product name contains powder (whole word only, not "power")
                            const isPowder = /\bpowder\b/i.test(productName);
                            
                            // If order code exists, format appropriately
                            const variation = row[columns.variationName] || '';
                            let displayOrderCode = null;
                            if (orderCode) {
                                if (parentSku === 'PFFB-2B') {
                                    // Special case: show OrderCode (ParentSKU) - Quantity
                                    displayOrderCode = `${orderCode} (${parentSku}) - ${quantity}`;
                                } else if (isPowder) {
                                    // Powder format: OrderCode Powder - Quantity
                                    displayOrderCode = `${orderCode} Powder - ${quantity}`;
                                } else if (variation) {
                                    // Variation format: OrderCode - Variation x Quantity
                                    displayOrderCode = `${orderCode} - ${variation} x ${quantity}`;
                                } else {
                                    // Basic format: OrderCode - Quantity
                                    displayOrderCode = `${orderCode} - ${quantity}`;
                                }
                            }
                            
                            results.push({
                                source: file,
                                orderId: row[columns.orderId] || 'N/A',
                                trackingNumber: rowTracking,
                                productName: productName,
                                parentSku: parentSku,
                                variationName: row[columns.variationName] || '',
                                quantity: quantity,
                                dealPrice: row[columns.dealPrice] || 'N/A',
                                username: row[columns.username] || 'N/A',
                                receiverName: row[columns.receiverName] || 'N/A',
                                phoneNumber: row[columns.phoneNumber] || 'N/A',
                                deliveryAddress: row[columns.deliveryAddress] || 'N/A',
                                skuWeight: row[columns.skuWeight] || 'N/A',
                                shippingCourier: courier,
                                orderCode: displayOrderCode,
                                hasOrderCode: !!orderCode
                            });
                        }
                    }
                }
            } catch (err) {
                console.error(`Error reading file ${file}:`, err.message);
            }
        }
        
        // Mark this tracking number as scanned if results found
        let alreadyScanned = false;
        if (results.length > 0) {
            const courier = results[0].shippingCourier;
            
            // Check if already scanned
            const existing = isAlreadyScanned.get(trackingNumber);
            alreadyScanned = !!existing;
            
            try {
                insertScannedOrder.run(trackingNumber, courier);
            } catch (e) {
                // Ignore duplicate errors
            }
        }
        
        const courierStats = getCourierStats();
        return { results, error: null, courierStats, alreadyScanned };
    } catch (err) {
        return { error: err.message, results: [], courierStats: [] };
    }
}

function getLoadedFiles() {
    try {
        const files = fs.readdirSync(EXCEL_FOLDER).filter(file => 
            file.endsWith('.xlsx') || file.endsWith('.xls')
        );
        return files;
    } catch (err) {
        return [];
    }
}

// Socket.IO handlers
function setupSocketHandlers(socketServer) {
    socketServer.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        
        socket.emit('files-loaded', getLoadedFiles());
        socket.emit('courier-stats', getCourierStats());
        
        socket.on('scan', (trackingNumber) => {
            console.log('Scanning for:', trackingNumber);
            const { results, error, courierStats, alreadyScanned } = searchTrackingNumber(trackingNumber);
            
            const payload = {
                trackingNumber,
                results,
                error,
                courierStats,
                alreadyScanned,
                timestamp: new Date().toISOString()
            };
            
            io.emit('scan-result', payload);
            ioHttp.emit('scan-result', payload);
        });
        
        socket.on('save-order-code', (data) => {
            const { parentSku, productName, orderCode } = data;
            console.log('Saving order code:', parentSku, orderCode);
            
            try {
                insertOrderCode.run(parentSku, productName, orderCode);
                
                // Broadcast updated order codes
                io.emit('order-code-saved', { parentSku, orderCode });
                ioHttp.emit('order-code-saved', { parentSku, orderCode });
            } catch (err) {
                console.error('Error saving order code:', err.message);
            }
        });
        
        socket.on('get-order-codes', () => {
            const codes = getAllOrderCodes.all();
            socket.emit('order-codes-list', codes);
        });
        
        socket.on('reset-scanned', () => {
            clearScannedOrders.run();
            const stats = getCourierStats();
            io.emit('courier-stats', stats);
            ioHttp.emit('courier-stats', stats);
        });
        
        socket.on('refresh-files', () => {
            const files = getLoadedFiles();
            const stats = getCourierStats();
            io.emit('files-loaded', files);
            io.emit('courier-stats', stats);
            ioHttp.emit('files-loaded', files);
            ioHttp.emit('courier-stats', stats);
        });
        
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
}

setupSocketHandlers(io);
setupSocketHandlers(ioHttp);

// API endpoints
app.post('/api/search', (req, res) => {
    const { trackingNumber } = req.body;
    const { results, error, courierStats } = searchTrackingNumber(trackingNumber);
    res.json({ trackingNumber, results, error, courierStats });
});

app.get('/api/files', (req, res) => {
    res.json(getLoadedFiles());
});

app.get('/api/order-codes', (req, res) => {
    const codes = getAllOrderCodes.all();
    res.json(codes);
});

app.post('/api/order-code', (req, res) => {
    const { parentSku, productName, orderCode } = req.body;
    try {
        insertOrderCode.run(parentSku, productName, orderCode);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/courier-stats', (req, res) => {
    res.json(getCourierStats());
});

app.get('/api/scanned-tracking', (req, res) => {
    const scanned = getAllScannedTracking.all();
    res.json(scanned.map(s => s.tracking_number));
});

app.post('/api/compare', (req, res) => {
    const { list } = req.body;
    if (!list) {
        return res.json({ error: 'No list provided', remaining: [], scanned: [] });
    }
    
    // Get all scanned tracking numbers
    const scannedRows = getAllScannedTracking.all();
    const scannedSet = new Set(scannedRows.map(s => s.tracking_number.toLowerCase()));
    
    // Parse the input list - extract tracking numbers (PH...) and order IDs
    const lines = list.split('\n').map(l => l.trim()).filter(l => l);
    const trackingNumbers = [];
    const orderIds = [];
    
    for (const line of lines) {
        // Tracking numbers start with PH and are alphanumeric
        if (/^PH[A-Z0-9]+$/i.test(line)) {
            trackingNumbers.push(line);
        }
        // Order IDs are alphanumeric, typically start with date digits
        else if (/^[0-9]{6}[A-Z0-9]+$/i.test(line)) {
            orderIds.push(line);
        }
    }
    
    // Check which tracking numbers have been scanned
    const remaining = [];
    const scanned = [];
    
    for (const tracking of trackingNumbers) {
        if (scannedSet.has(tracking.toLowerCase())) {
            scanned.push(tracking);
        } else {
            remaining.push(tracking);
        }
    }
    
    res.json({
        total: trackingNumbers.length,
        scannedCount: scanned.length,
        remainingCount: remaining.length,
        remaining,
        scanned,
        orderIds
    });
});

app.get('/cert.pem', (req, res) => {
    const certPath = path.join(__dirname, 'cert.pem');
    if (fs.existsSync(certPath)) {
        res.setHeader('Content-Type', 'application/x-pem-file');
        res.setHeader('Content-Disposition', 'attachment; filename="spx-scanner.pem"');
        res.sendFile(certPath);
    } else {
        res.status(404).send('Certificate not found');
    }
});

function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

const PORT = 3000;
const HTTPS_PORT = 3443;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP server running on port ${PORT}`);
});

httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('\n========================================');
    console.log('   SPX Product Searcher - Running!');
    console.log('========================================');
    console.log(`\nDesktop View: http://localhost:${PORT}`);
    console.log(`Phone Scanner: https://${localIP}:${HTTPS_PORT}/scanner.html`);
    console.log(`\nExcel files folder: ${EXCEL_FOLDER}`);
    console.log(`Downloads folder: ${DOWNLOADS_FOLDER}`);
    console.log(`Files loaded: ${getLoadedFiles().length}`);
    console.log('\nAuto-copy: Excel files from Downloads will be copied automatically');
    console.log('\n========================================\n');
});
