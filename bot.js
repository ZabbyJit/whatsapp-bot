const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');

const OWNER_NUMBER = '12345678900'; // <-- ⚠️ REPLACE WITH YOUR NUMBER

async function connectToWhatsApp() {
    console.log('[LOG] Starting connectToWhatsApp function...');

    console.log('[LOG] Awaiting useMultiFileAuthState...');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    console.log('[LOG] useMultiFileAuthState completed.');

    console.log('[LOG] Creating socket with makeWASocket...');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Mr. Ari Bot', 'Chrome', '1.0.0'] // Added browser info
    });
    console.log('[LOG] Socket created.');

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        // This will show us every single update from the server
        console.log(`[LOG] Connection update received: ${JSON.stringify(update)}`);

        if (qr) {
            console.log("--- QR CODE FOUND! ---");
            console.log("Scan this with your phone's WhatsApp -> Linked Devices");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[LOG] Connection closed. Reason:', lastDisconnect.error, '. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Mr. Ari is connected and ready!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!messageText) return;

        const from = msg.key.remoteJid;
        const text = messageText.toLowerCase().trim();
        
        const sendMessage = (text) => {
            sock.sendMessage(from, { text: text });
        };

        if (!isRestaurantOpen()) {
            sendMessage("I'm sorry, but our restaurant is currently closed. We are open from 11:00 to 23:00.");
            return;
        }

        if (text.includes('menu')) {
            sendMessage("🍔 Menu:\n• Burgers\n• Pizza\n• Trending Deals");
        } else if (text.includes('support')) {
            sendMessage("A notification has been sent to the owner.");
            const ownerJid = `${OWNER_NUMBER}@s.whatsapp.net`;
            sock.sendMessage(ownerJid, { text: `🔔 Support Request from ${from.split('@')[0]}` });
        } else {
            sendMessage("Hello! I'm *Mr. Ari*.\nReply with 'menu' to see our options.");
        }
    });
}

function isRestaurantOpen() {
    const now = new Date();
    const currentHour = now.getHours();
    const openingHour = 11;
    const closingHour = 23;
    return currentHour >= openingHour && currentHour < closingHour;
}

console.log('[LOG] Initializing the bot connection...');
connectToWhatsApp();
