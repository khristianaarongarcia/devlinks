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
const pdfParse = require('pdf-parse');
const { PDFDocument, rgb } = require('pdf-lib');
const multer = require('multer');

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
const deleteOrderCodeById = db.prepare('DELETE FROM order_codes WHERE id = ?');

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
const PDF_FOLDER = path.join(__dirname, 'pdfs');

if (!fs.existsSync(EXCEL_FOLDER)) {
    fs.mkdirSync(EXCEL_FOLDER);
    console.log('Created excel_files folder. Please place your Excel files there.');
}

if (!fs.existsSync(PDF_FOLDER)) {
    fs.mkdirSync(PDF_FOLDER);
    console.log('Created pdfs folder. You can place PDF files here or use Downloads folder.');
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

// Column keyword mappings - supports Shopee, Lazada, and TikTok Shop
const COLUMN_KEYWORDS = {
    // Shopee: "Order ID", Lazada: "orderNumber", TikTok: "Order ID"
    orderId: ['order id', 'orderid', 'order_id', 'order no', 'order number', 'ordernumber'],
    
    // Shopee: "Tracking Number", Lazada: "trackingCode", TikTok: "Tracking ID"
    trackingNumber: ['tracking number', 'tracking no', 'tracking id', 'trackingid', 'tracking', 'tracking_number', 'trackingcode', 'awb', 'waybill', 'cdtrackingcode', 'cd tracking code'],
    
    // Shopee: "Product Name", Lazada: "itemName", TikTok: "Product Name"
    productName: ['product name', 'productname', 'product_name', 'item name', 'itemname', 'item', 'product'],
    
    // Shopee: "Parent SKU", Lazada: "sellerSku", TikTok: "Seller SKU"
    parentSku: ['parent sku', 'sku reference', 'sku ref', 'parent_sku', 'parentsku', 'sku', 'sellersku', 'seller sku'],
    
    // Shopee: "Variation Name", Lazada: "variation", TikTok: "Variation"
    variationName: ['variation name', 'variation', 'variant', 'option'],
    
    // Shopee: "Quantity", Lazada: might need calculation or default to 1, TikTok: "Quantity"
    quantity: ['quantity', 'qty', 'quantity ordered'],
    
    // Shopee: "Deal Price", Lazada: "paidPrice" or "unitPrice", TikTok: "SKU Unit Original Price"
    dealPrice: ['deal price', 'price', 'unit price', 'unitprice', 'selling price', 'paidprice', 'paid price', 'sku unit original price', 'unit original price'],
    
    // Shopee: "Username (Buyer)", Lazada: "customerName" or "customerEmail", TikTok: "Buyer Username"
    username: ['username', 'buyer', 'customer', 'username (buyer)', 'customername', 'customer name', 'customeremail', 'buyer username'],
    
    // Shopee: "Receiver Name", Lazada: "shippingName", TikTok: "Recipient"
    receiverName: ['receiver name', 'recipient', 'receiver', 'ship to name', 'shippingname', 'shipping name'],
    
    // Shopee: "Phone Number", Lazada: "shippingPhone", TikTok: "Phone #"
    phoneNumber: ['phone number', 'phone', 'contact', 'mobile', 'tel', 'shippingphone', 'shipping phone', 'phone #'],
    
    // Shopee: "Delivery Address", Lazada: "shippingAddress", TikTok: "Detail Address" (might need to combine multiple fields)
    deliveryAddress: ['delivery address', 'address', 'shipping address', 'ship to address', 'shippingaddress', 'detail address'],
    
    // Shopee: "SKU Total Weight", Lazada: might not be available, TikTok: "Weight(kg)"
    skuWeight: ['sku total weight', 'weight', 'total weight', 'item weight', 'weight(kg)', 'weight (kg)'],
    
    // Shopee: "Shipping Option", Lazada: "shippingProvider" or "cdShippingProvider", TikTok: "Shipping Provider Name"
    shippingCourier: ['shipping provider name', 'shipping option', 'courier', 'shipping provider', 'shippingprovider', 'cdshippingprovider', 'cd shipping provider', 'shipping', 'carrier', 'logistics', 'shipment method', 'delivery option']
};

function findColumn(headers, keywords) {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    
    // First pass: exact match (case-insensitive)
    for (const keyword of keywords) {
        for (let i = 0; i < lowerHeaders.length; i++) {
            if (lowerHeaders[i] === keyword.toLowerCase()) {
                return headers[i];
            }
        }
    }
    
    // Second pass: contains match
    for (const keyword of keywords) {
        for (let i = 0; i < lowerHeaders.length; i++) {
            if (lowerHeaders[i].includes(keyword)) {
                return headers[i];
            }
        }
    }
    
    return null;
}

function formatOrderCodeDisplay(orderCode, parentSku, productName, variation, quantity) {
    if (!orderCode) return null;
    const qty = Number(quantity) || 1;
    const isPowder = /\bpowder\b/i.test(String(productName || ''));

    if (parentSku === 'PFFB-2B') {
        // Special case: show OrderCode (ParentSKU) - Quantity
        return `${orderCode} (${parentSku}) - ${qty}`;
    }
    if (isPowder) {
        // Powder format: OrderCode Powder - Quantity
        return `${orderCode} Powder - ${qty}`;
    }
    if (variation) {
        // Variation format: OrderCode - Variation x Quantity
        return `${orderCode} - ${variation} x ${qty}`;
    }
    // Basic format: OrderCode - Quantity
    return `${orderCode} - ${qty}`;
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
                    let data = XLSX.utils.sheet_to_json(sheet);
                    if (data.length === 0) continue;
                    
                    const headers = Object.keys(data[0]);
                    
                    // Detect platform type
                    let platform = 'Unknown';
                    if (headers.some(h => h.toLowerCase() === 'tracking id' || h.toLowerCase() === 'buyer username')) {
                        platform = 'TikTok';
                    } else if (headers.some(h => h.toLowerCase() === 'orderitemid' || h.toLowerCase() === 'sellersku')) {
                        platform = 'Lazada';
                    } else if (headers.some(h => h.toLowerCase().includes('parent sku reference'))) {
                        platform = 'Shopee';
                    }
                    
                    // Detect and filter TikTok description row
                    const isTikTok = platform === 'TikTok';
                    
                    if (isTikTok && data.length > 0) {
                        const firstRow = data[0];
                        const orderIdValue = String(firstRow['Order ID'] || '');
                        const trackingValue = String(firstRow['Tracking ID'] || '');
                        const courierValue = String(firstRow['Shipping Provider Name'] || '');
                        
                        const isDescriptionRow = 
                            orderIdValue.toLowerCase().includes('platform') || 
                            orderIdValue.toLowerCase().includes('unique') ||
                            orderIdValue.endsWith('.') ||
                            trackingValue.toLowerCase().includes("order's") ||
                            trackingValue.toLowerCase().includes('tracking number') ||
                            courierValue.toLowerCase().includes("order's") ||
                            courierValue.toLowerCase().includes('shipping provider');
                        
                        if (isDescriptionRow) {
                            data = data.slice(1);
                        }
                    }
                    
                    if (data.length === 0) continue;
                    
                    const courierCol = findColumn(headers, COLUMN_KEYWORDS.shippingCourier);
                    const trackingCol = findColumn(headers, COLUMN_KEYWORDS.trackingNumber);
                    
                    console.log(`[${file}] Platform: ${platform}, Courier col: ${courierCol}, Tracking col: ${trackingCol}`);
                    
                    if (!courierCol || !trackingCol) continue;
                    
                    for (const row of data) {
                        const courier = String(row[courierCol] || '').trim();
                        const tracking = String(row[trackingCol] || '').trim();
                        
                        // Skip rows with description text
                        if (courier.toLowerCase().includes("order's") || 
                            courier.toLowerCase().includes('shipping provider name.') ||
                            tracking.toLowerCase().includes("order's")) {
                            continue;
                        }
                        
                        if (courier && tracking) {
                            // Store without platform label for uniqueness
                            const key = `${courier}-${tracking}`;
                            if (!seenTrackingNumbers[key]) {
                                seenTrackingNumbers[key] = true;
                                
                                // Add platform label for display
                                const courierWithPlatform = `${courier} [${platform}]`;
                                courierCounts[courierWithPlatform] = (courierCounts[courierWithPlatform] || 0) + 1;
                                
                                console.log(`  Found: ${courier} [${platform}] - ${tracking.substring(0, 15)}...`);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`Error reading file ${file}:`, err.message);
            }
        }
        
        console.log(`\nTotal courier stats:`, courierCounts);
        
        // Format results
        const results = Object.keys(courierCounts).map(courier => {
            // Extract base courier name without platform label for scanned lookup
            const baseCourier = courier.replace(/\s*\[.*?\]\s*$/, '');
            const scannedCount = scannedByCourer[baseCourier] || 0;
            
            console.log(`  ${courier}: total=${courierCounts[courier]}, scanned=${scannedCount}, baseCourier="${baseCourier}"`);
            
            return {
                courier,
                total: courierCounts[courier],
                scanned: scannedCount
            };
        });
        
        console.log(`\nFinal results:`, results);
        
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
        console.log(`\n========== SEARCH STARTED ==========`);
        console.log(`Looking for tracking: ${trackingNumber}`);
        
        const files = fs.readdirSync(EXCEL_FOLDER).filter(file => 
            file.endsWith('.xlsx') || file.endsWith('.xls')
        );

        console.log(`Found ${files.length} Excel file(s):`, files);

        if (files.length === 0) {
            console.log('ERROR: No Excel files found!');
            return { error: 'No Excel files found in excel_files folder', results: [], courierStats: [] };
        }

        for (const file of files) {
            const filePath = path.join(EXCEL_FOLDER, file);
            console.log(`\n--- Processing file: ${file} ---`);
            
            try {
                const workbook = XLSX.readFile(filePath);
                console.log(`Sheets in file: ${workbook.SheetNames.join(', ')}`);
                
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    let data = XLSX.utils.sheet_to_json(sheet);
                    
                    console.log(`Sheet "${sheetName}": ${data.length} rows (before filtering)`);
                    
                    if (data.length === 0) {
                        console.log(`Skipping empty sheet: ${sheetName}`);
                        continue;
                    }
                    
                    const headers = Object.keys(data[0]);
                    console.log(`Headers found:`, headers.slice(0, 10).join(', '), headers.length > 10 ? '...' : '');
                    
                    // Detect if this is a TikTok file by checking for TikTok-specific columns
                    const isTikTok = headers.some(h => 
                        h.toLowerCase() === 'tracking id' || 
                        h.toLowerCase() === 'seller sku' ||
                        h.toLowerCase() === 'buyer username'
                    );
                    
                    console.log(`Is TikTok file: ${isTikTok}`);
                    
                    // Filter out TikTok's description row (row 2 in Excel)
                    if (isTikTok && data.length > 0) {
                        // Check if first row is the description row by looking at multiple columns
                        const firstRow = data[0];
                        const orderIdValue = String(firstRow['Order ID'] || '');
                        const trackingValue = String(firstRow['Tracking ID'] || '');
                        const courierValue = String(firstRow['Shipping Provider Name'] || '');
                        
                        console.log(`First row values:`, {
                            orderId: orderIdValue.substring(0, 50),
                            tracking: trackingValue.substring(0, 50),
                            courier: courierValue.substring(0, 50)
                        });
                        
                        // TikTok description row contains phrases like "Platform unique order ID." or "The order's..."
                        const isDescriptionRow = 
                            orderIdValue.toLowerCase().includes('platform') || 
                            orderIdValue.toLowerCase().includes('unique') ||
                            orderIdValue.endsWith('.') ||
                            trackingValue.toLowerCase().includes("order's") ||
                            trackingValue.toLowerCase().includes('tracking number') ||
                            courierValue.toLowerCase().includes("order's") ||
                            courierValue.toLowerCase().includes('shipping provider');
                        
                        if (isDescriptionRow) {
                            console.log(`✓ Detected TikTok description row, removing it...`);
                            data = data.slice(1);
                        } else {
                            console.log(`✗ First row appears to be actual data, keeping it`);
                        }
                    }
                    
                    console.log(`Sheet "${sheetName}": ${data.length} rows (after filtering)`);
                    
                    if (data.length === 0) {
                        console.log(`No data rows after filtering`);
                        continue;
                    }
                    console.log(`Headers found:`, headers.slice(0, 10).join(', '), headers.length > 10 ? '...' : '');
                    
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
                    
                    console.log(`Column mapping:`, {
                        trackingNumber: columns.trackingNumber,
                        productName: columns.productName,
                        parentSku: columns.parentSku,
                        courier: columns.shippingCourier
                    });
                    
                    // Show what courier values are in the data
                    if (columns.shippingCourier && data.length > 0) {
                        const sampleCourier = String(data[0][columns.shippingCourier] || '').trim();
                        console.log(`Sample courier value: "${sampleCourier}"`);
                    } else if (!columns.shippingCourier) {
                        console.log(`WARNING: No courier column detected!`);
                        const courierRelated = headers.filter(h => 
                            h.toLowerCase().includes('ship') || 
                            h.toLowerCase().includes('courier') ||
                            h.toLowerCase().includes('carrier')
                        );
                        console.log(`Shipping-related columns:`, courierRelated);
                    }
                    
                    // For Lazada files, check what tracking columns exist
                    const trackingRelatedCols = headers.filter(h => 
                        h.toLowerCase().includes('track') || h.toLowerCase().includes('awb')
                    );
                    if (trackingRelatedCols.length > 0) {
                        console.log(`All tracking-related columns found:`, trackingRelatedCols);
                        console.log(`Sample values from each tracking column:`);
                        if (data.length > 0) {
                            trackingRelatedCols.forEach(col => {
                                const val = String(data[0][col] || '').trim();
                                console.log(`  ${col}: "${val}"`);
                            });
                        }
                    }
                    
                    if (!columns.trackingNumber) {
                        console.log(`WARNING: No tracking number column found in sheet "${sheetName}"`);
                        console.log(`Available headers:`, headers);
                        continue;
                    }
                    
                    // Sample first 3 tracking numbers from this sheet
                    console.log(`Sample tracking numbers from this sheet:`);
                    for (let i = 0; i < Math.min(3, data.length); i++) {
                        const sampleTracking = String(data[i][columns.trackingNumber] || '').trim();
                        console.log(`  Row ${i + 1}: "${sampleTracking}"`);
                    }
                    
                    let foundInSheet = 0;
                    for (const row of data) {
                        const rowTracking = String(row[columns.trackingNumber] || '').trim();
                        
                        // Skip TikTok description rows that might have slipped through
                        if (rowTracking.toLowerCase().includes("order's") || 
                            rowTracking.toLowerCase().includes('tracking number.')) {
                            continue;
                        }
                        
                        if (rowTracking.toLowerCase() === trackingNumber.toLowerCase()) {
                            foundInSheet++;
                            console.log(`✓ MATCH FOUND in row:`, {
                                tracking: rowTracking,
                                sku: row[columns.parentSku],
                                product: row[columns.productName]?.substring(0, 50)
                            });
                            
                            const parentSku = row[columns.parentSku] || 'N/A';
                            const productName = row[columns.productName] || 'N/A';
                            const quantity = row[columns.quantity] || 1;
                            const courier = row[columns.shippingCourier] || 'Unknown';
                            
                            // Build delivery address (handle Lazada and TikTok multi-column formats)
                            let deliveryAddress = row[columns.deliveryAddress] || '';
                            
                            // If deliveryAddress is empty or just the detail, try to build full address
                            if (!deliveryAddress || deliveryAddress === 'N/A') {
                                const addressParts = [];
                                
                                // Try Lazada format: shippingAddress2-5
                                for (let i = 2; i <= 5; i++) {
                                    const addrCol = findColumn(headers, [`shippingaddress${i}`, `shipping address ${i}`]);
                                    if (addrCol && row[addrCol]) {
                                        addressParts.push(String(row[addrCol]).trim());
                                    }
                                }
                                
                                if (addressParts.length > 0) {
                                    deliveryAddress = addressParts.join(', ');
                                }
                            }
                            
                            // If still empty, try TikTok format: Region, Province, Municipality, Barangay, Detail Address
                            if (!deliveryAddress || deliveryAddress === 'N/A') {
                                const addressParts = [];
                                const tiktokAddressFields = ['barangay', 'municipality', 'province', 'region'];
                                
                                for (const field of tiktokAddressFields) {
                                    const col = findColumn(headers, [field]);
                                    if (col && row[col]) {
                                        addressParts.push(String(row[col]).trim());
                                    }
                                }
                                
                                // Add detail address last
                                const detailCol = findColumn(headers, ['detail address', 'detailaddress']);
                                if (detailCol && row[detailCol]) {
                                    addressParts.unshift(String(row[detailCol]).trim());
                                }
                                
                                if (addressParts.length > 0) {
                                    deliveryAddress = addressParts.join(', ');
                                }
                            }
                            
                            // Get order code from database
                            const orderCodeRow = getOrderCode.get(parentSku);
                            let orderCode = orderCodeRow ? orderCodeRow.order_code : null;
                            
                            const variation = row[columns.variationName] || '';
                            const displayOrderCode = formatOrderCodeDisplay(orderCode, parentSku, productName, variation, quantity);
                            
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
                                deliveryAddress: deliveryAddress || 'N/A',
                                skuWeight: row[columns.skuWeight] || 'N/A',
                                shippingCourier: courier,
                                orderCode: displayOrderCode,
                                rawOrderCode: orderCode,
                                hasOrderCode: !!orderCode
                            });
                        }
                    }
                    
                    console.log(`Found ${foundInSheet} match(es) in sheet "${sheetName}"`);
                }
            } catch (err) {
                console.error(`ERROR reading file ${file}:`, err.message);
            }
        }

        // Lazada often splits the same Order ID + Tracking Number into multiple rows.
        // Merge duplicates (same source file + tracking + orderId + SKU + variation + product) and SUM quantity.
        if (results.length > 1) {
            const merged = new Map();
            for (const r of results) {
                const key = [
                    r.source,
                    r.trackingNumber,
                    r.orderId,
                    r.parentSku,
                    r.variationName,
                    r.productName
                ].join('||');

                if (!merged.has(key)) {
                    merged.set(key, {
                        ...r,
                        quantity: Number(r.quantity) || 1
                    });
                } else {
                    const existing = merged.get(key);
                    existing.quantity = (Number(existing.quantity) || 0) + (Number(r.quantity) || 1);
                }
            }

            // Replace results in-place
            results.length = 0;
            for (const item of merged.values()) {
                if (item.rawOrderCode) {
                    item.orderCode = formatOrderCodeDisplay(
                        item.rawOrderCode,
                        item.parentSku,
                        item.productName,
                        item.variationName,
                        item.quantity
                    );
                }
                results.push(item);
            }
        }
        
        console.log(`\n========== SEARCH COMPLETE ==========`);
        console.log(`Total results found: ${results.length}`);
        if (results.length > 0) {
            console.log(`Sources:`, results.map(r => r.source).join(', '));
        }
        console.log(`=====================================\n`);
        
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

        socket.on('delete-order-code', (data) => {
            const id = typeof data === 'object' ? data.id : data;
            if (!id) return;

            try {
                deleteOrderCodeById.run(id);
                io.emit('order-code-deleted', { id });
                ioHttp.emit('order-code-deleted', { id });
            } catch (err) {
                console.error('Error deleting order code:', err.message);
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

app.delete('/api/order-code/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        deleteOrderCodeById.run(id);
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

// PDF Processing endpoints
app.get('/api/pdfs', (req, res) => {
    try {
        const pdfFiles = [];
        
        // Check Downloads folder first
        const downloadsFiles = fs.readdirSync(DOWNLOADS_FOLDER).filter(file => 
            file.toLowerCase().endsWith('.pdf')
        );
        
        // Check Downloads Documents subfolder
        const downloadsDocumentsPath = path.join(DOWNLOADS_FOLDER, 'Documents');
        const downloadsDocumentsFiles = [];
        if (fs.existsSync(downloadsDocumentsPath)) {
            downloadsDocumentsFiles.push(...fs.readdirSync(downloadsDocumentsPath).filter(file => 
                file.toLowerCase().endsWith('.pdf')
            ));
        }
        
        // Check local pdfs folder
        const localFiles = [];
        if (fs.existsSync(PDF_FOLDER)) {
            localFiles.push(...fs.readdirSync(PDF_FOLDER).filter(file => 
                file.toLowerCase().endsWith('.pdf')
            ));
        }
        
        // Combine files with metadata
        downloadsFiles.forEach(file => {
            const filePath = path.join(DOWNLOADS_FOLDER, file);
            const stats = fs.statSync(filePath);
            pdfFiles.push({
                name: file,
                path: filePath,
                modified: stats.mtime,
                source: 'Downloads'
            });
        });
        
        downloadsDocumentsFiles.forEach(file => {
            const filePath = path.join(downloadsDocumentsPath, file);
            const stats = fs.statSync(filePath);
            pdfFiles.push({
                name: file,
                path: filePath,
                modified: stats.mtime,
                source: 'Downloads/Documents'
            });
        });
        
        localFiles.forEach(file => {
            const filePath = path.join(PDF_FOLDER, file);
            const stats = fs.statSync(filePath);
            pdfFiles.push({
                name: file,
                path: filePath,
                modified: stats.mtime,
                source: 'Local'
            });
        });
        
        // Sort by modified date (most recent first)
        pdfFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        
        res.json(pdfFiles);
    } catch (err) {
        console.error('Error listing PDFs:', err.message);
        res.json([]);
    }
});

app.post('/api/pdf-load', async (req, res) => {
    let pdfPath = req.body.path;
    
    // Handle escaped backslashes
    if (pdfPath && typeof pdfPath === 'string') {
        pdfPath = pdfPath.replace(/\\\\/g, '\\');
    }
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
        return res.json({ error: 'PDF file not found' });
    }
    
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(dataBuffer);
        const pages = pdfDoc.getPages();
        
        // Store original for caching
        const cacheKey = `${pdfPath}_original`;
        if (!modifiedPDFs.has(cacheKey)) {
            modifiedPDFs.set(cacheKey, pdfDoc);
        }
        
        res.json({
            path: pdfPath,
            totalPages: pages.length,
            text: 'PDF loaded successfully',
            info: { author: pdfDoc.getTitle() || 'Unknown', pages: pages.length }
        });
    } catch (err) {
        console.error('PDF Load Error:', err);
        res.json({ error: 'Error loading PDF: ' + err.message });
    }
});

app.post('/api/pdf-extract-tracking', async (req, res) => {
    let pdfPath = req.body.path;
    
    // Handle escaped backslashes
    if (pdfPath && typeof pdfPath === 'string') {
        pdfPath = pdfPath.replace(/\\\\/g, '\\');
    }
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
        return res.json({ error: 'PDF file not found' });
    }
    
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        
        // Try to extract text from PDF
        try {
            const pdfData = await pdfParse(dataBuffer);
            
            // Extract tracking numbers using regex
            const trackingRegex = /\bPH[A-Z0-9]{8,15}\b/gi;
            const matches = pdfData.text.match(trackingRegex);
            
            if (matches && matches.length > 0) {
                // Return the first valid tracking number found
                res.json({ trackingNumber: matches[0].toUpperCase() });
            } else {
                res.json({ trackingNumber: null });
            }
        } catch (pdfError) {
            console.error('PDF parsing failed, trying alternative method:', pdfError.message);
            
            // If pdf-parse fails, return null and log the error
            res.json({ trackingNumber: null, error: 'PDF text extraction failed' });
        }
    } catch (err) {
        console.error('Error extracting tracking:', err.message);
        res.json({ error: 'Error extracting tracking: ' + err.message });
    }
});

app.post('/api/pdf-render', async (req, res) => {
    let pdfPath = req.body.path;
    
    // Handle escaped backslashes
    if (pdfPath && typeof pdfPath === 'string') {
        pdfPath = pdfPath.replace(/\\\\/g, '\\');
    }
    
    const page = req.body.page;
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
        return res.json({ error: 'PDF file not found' });
    }
    
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(dataBuffer);
        const totalPages = pdfDoc.getPageCount();
        
        if (page < 1 || page > totalPages) {
            return res.json({ error: 'Invalid page number' });
        }
        
        // For now, return a placeholder - in a real implementation you'd convert to image
        // This requires additional setup with canvas or similar
        res.json({
            imageUrl: `data:image/svg+xml;base64,${Buffer.from(`
                <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#f0f0f0"/>
                    <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="24" fill="#666">
                        PDF Page ${page} Preview
                    </text>
                </svg>
            `).toString('base64')}`,
            totalPages: totalPages
        });
    } catch (err) {
        res.json({ error: 'Error rendering PDF page: ' + err.message });
    }
});

app.post('/api/pdf-save', async (req, res) => {
    const { path: pdfPath, orderCode, config } = req.body;
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
        return res.json({ error: 'PDF file not found' });
    }
    
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(dataBuffer);
        const pages = pdfDoc.getPages();
        
        // Add order code overlay to each page
        if (orderCode) {
            for (const page of pages) {
                const { width, height } = page.getSize();
                const x = (config.xPos / 100) * width;
                const y = height - ((config.yPos / 100) * height);
                
                page.drawText(orderCode, {
                    x: x,
                    y: y,
                    size: parseInt(config.fontSize),
                    color: rgb(0, 0, 0),
                    rotate: (config.rotation * Math.PI) / 180
                });
            }
        }
        
        // Save modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        const timestamp = Date.now();
        const outputPath = path.join(__dirname, 'public', 'temp', `modified_${timestamp}.pdf`);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, 'public', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, modifiedPdfBytes);
        
        res.json({ 
            success: true,
            downloadUrl: `/temp/${path.basename(outputPath)}`,
            timestamp: timestamp
        });
    } catch (err) {
        console.error('PDF Save Error:', err);
        res.json({ error: 'Error saving PDF: ' + err.message });
    }
});

app.post('/api/pdf-print', async (req, res) => {
    const { path: pdfPath, orderCode, config } = req.body;
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
        return res.json({ error: 'PDF file not found' });
    }
    
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(dataBuffer);
        const pages = pdfDoc.getPages();
        
        // Add order code overlay to each page
        if (orderCode) {
            for (const page of pages) {
                const { width, height } = page.getSize();
                const x = (config.xPos / 100) * width;
                const y = height - ((config.yPos / 100) * height);
                
                page.drawText(orderCode, {
                    x: x,
                    y: y,
                    size: parseInt(config.fontSize),
                    color: rgb(0, 0, 0),
                    rotate: (config.rotation * Math.PI) / 180
                });
            }
        }
        
        // Save modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        const timestamp = Date.now();
        const outputPath = path.join(__dirname, 'public', 'temp', `print_${timestamp}.pdf`);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, 'public', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, modifiedPdfBytes);
        
        res.json({ 
            success: true,
            printUrl: `/temp/${path.basename(outputPath)}`
        });
    } catch (err) {
        console.error('PDF Print Error:', err);
        res.json({ error: 'Error preparing PDF for print: ' + err.message });
    }
});
            }
        }
            
            // Save modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            const timestamp = Date.now();
            const outputPath = path.join(__dirname, 'public', 'temp', `print_${timestamp}.pdf`);
            
            // Ensure temp directory exists
            const tempDir = path.join(__dirname, 'public', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            fs.writeFileSync(outputPath, modifiedPdfBytes);
            
            res.json({ 
                success: true,
                printUrl: `/temp/${path.basename(outputPath)}`
            });
        } catch (err) {
            console.error('PDF Print Error:', err);
            res.json({ error: 'Error preparing PDF for print: ' + err.message });
        }
    }
        
        fs.writeFileSync(outputPath, modifiedPdfBytes);
        
        res.json({ 
            success: true,
            printUrl: `/temp/${path.basename(outputPath)}`
        });
    } catch (err) {
        console.error('PDF Print Error:', err);
        res.json({ error: 'Error preparing PDF for print: ' + err.message });
    }
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