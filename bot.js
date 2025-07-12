const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log("Starting Mr. Ari, your restaurant bot...");

const OWNER_NUMBER = '12345678900'; // <-- ⚠️ REPLACE WITH YOUR NUMBER

// --- FIX FOR RAILWAY DEPLOYMENT ---
// The 'puppeteer' options are the special instructions Railway needs.
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
    }
});

client.on('qr', qr => {
    console.log('--- QR CODE DATA STRING ---');
    console.log('--- COPY THE LINE BELOW AND PASTE IT INTO THE QR-VIEWER.HTML TOOL ---');
    console.log(qr);
    console.log('--------------------------------------------------------------------');
    console.log('Generating text-based QR code for terminal display (you can ignore this):');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Mr. Ari is ready and connected!');
});

client.on('message', async message => {
    const msg = message.body.toLowerCase().trim();

    if (!isRestaurantOpen()) {
        await message.reply("I'm sorry, but our restaurant is currently closed. We are open from 11:00 to 23:00. Please message us again during our business hours!");
        return;
    }

    if (msg.includes('menu')) {
        await message.reply(
            "🍔 Here are our menu categories:\n\n" +
            "• Burgers\n" +
            "• Pizza\n" +
            "• Trending Deals\n\n" +
            "Just type the category you'd like to see!"
        );
    } else if (msg.includes('support')) {
        await message.reply("A notification has been sent to the owner. They will contact you shortly.");
        await client.sendMessage(`${OWNER_NUMBER}@c.us`, `🔔 Support Request from ${message.from}: Please contact this user.`);
    } else {
        await message.reply(
            "Hello! I'm *Mr. Ari*.\n\n" +
            "How can I help you? Reply with 'menu' to see all our options."
        );
    }
});

function isRestaurantOpen() {
    const now = new Date();
    // Remember to set the TZ variable in Railway to your timezone (e.g., America/New_York)
    const currentHour = now.getHours(); 
    const openingHour = 11;
    const closingHour = 23;
    console.log(`Time Check: Current Hour is ${currentHour}.`);
    return currentHour >= openingHour && currentHour < closingHour;
}

client.initialize();
