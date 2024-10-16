/* ======================================================== //

 * Base: DcodeKemii
 * Remake: KuroZann

// ======================================================== */
require('./settings')
const { default: makeWASocket,
    jidDecode,
    useMultiFileAuthState
} = require("@whiskeysockets/baileys")
const pino = require("pino")
const readline = require("readline")

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            resolve(answer.trim())
        })
    })
}

// Don't delete this code if don't want an error
async function StartSystem() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7']
    })
    
    // Request and display the pairing code
    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Input Number Start With Code Cuntry 62xxx :\n')
        let code = await sock.requestPairingCode(phoneNumber)
        code = code.match(/.{1,4}/g)?.join("-") || code
        console.log("This Is Your Pairing Code :", code)
    }
    
    // Connection notification in console
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'connecting') {
            console.log('pending connection')
        } else if (connection === 'close') {
            console.log('connection lost')
            StartSystem()
        } else if (connection === 'open') {
            console.log('connect ' + JSON.stringify(sock.user.id, null, 2))
        }
    })
    
    sock.ev.on('creds.update', saveCreds)
    
    // Messages updated upserts
    sock.ev.on('messages.upsert', async (update) => {
        const msg = update.messages[0]
        const maxTime = 5 * 60 * 1000
        sock.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {}
                return (
                    (decode.user && decode.server && decode.user + "@" + decode.server) || jid
                )
            } else return jid
        }
        
        // Auto view whatsapp status & react
        if (global.settings.autoreact && msg.key.remoteJid === 'status@broadcast') {
            if (msg.key.fromMe) return
            const currentTime = Date.now()
            const messageTime = msg.messageTimestamp * 1000
            const timeDiff = currentTime - messageTime
            
            // Time function
            if (timeDiff <= maxTime) {
                if (msg.pushName && msg.pushName.trim() !== "") {
                    await sock.readMessages([msg.key])
                    const timestamp = Date.now()
                    const dateObject = new Date(timestamp)
                    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
                    const dayName = days[dateObject.getDay()]
                    const date = dateObject.getDate()
                    const month = dateObject.getMonth() + 1
                    const year = dateObject.getFullYear()
                    const key = msg.key
                    const status = msg.key.remoteJid
                    const me = await sock.decodeJid(sock.user.id)
                    const emoji = global.emoji[Math.floor(Math.random() * global.emoji.length)]
                    await sock.sendMessage(status, {
                      react: {
                        key: key, text: emoji
                      }
                    }, { statusJidList: [key.participant, me] })
                    console.log("React WhatsApp Story")
                    console.log(`• Name: `, msg.pushName)
                    console.log(`• Date: `, `${dayName}, ${date}/${month}/${year}`)
                    console.log(`• React: `, emoji)
                }
            }
        }
    })
}

StartSystem()

process.on('uncaughtException', function(error) {
    console.log('Caught exception: ', error)
})