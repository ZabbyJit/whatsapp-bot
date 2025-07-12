const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');

const OWNER_NUMBER = '12345678900'; // <-- ⚠️ REPLACE WITH YOUR NUMBER

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("QR code received! Scan this with your phone's WhatsApp.");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
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
        console.log(`Received message from ${from}: ${text}`);

        const sendMessage = (text) => {
            sock.sendMessage(from, { text: text });
        };

        if (!isRestaurantOpen()) {
            sendMessage("I'm sorry, but our restaurant is currently closed. We are open from 11:00 to 23:00. Please message us again during our business hours!");
            return;
        }

        if (text.includes('menu')) {
            sendMessage(
                "🍔 Here are our menu categories:\n\n" +
                "• Burgers\n" +
                "• Pizza\n" +
                "• Trending Deals\n\n" +
                "Just type the category you'd like to see!"
            );
        } else if (text.includes('support')) {
            sendMessage("A notification has been sent to the owner. They will contact you shortly.");
            const ownerJid = `${OWNER_NUMBER}@s.whatsapp.net`;
            sock.sendMessage(ownerJid, { text: `🔔 Support Request from ${from.split('@')[0]}: Please contact this user.` });
        } else {
            sendMessage(
                "Hello! I'm *Mr. Ari*.\n\n" +
                "How can I help you? Reply with 'menu' to see all our options."
            );
        }
    });
}

function isRestaurantOpen() {
    const now = new Date();
    const currentHour = now.getHours(); // Remember to set TZ variable in Railway
    const openingHour = 11;
    const closingHour = 23;
    console.log(`Time Check: Current Hour is ${currentHour}.`);
    return currentHour >= openingHour && currentHour < closingHour;
}

// Run the bot
connectToWhatsApp();
