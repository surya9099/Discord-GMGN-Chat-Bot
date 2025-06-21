require('dotenv').config();
require('colors');
const { CronJob } = require('cron');
const Discord = require('discord-simple-api');
const fs = require('fs');

if (!process.env.DISCORD_TOKEN) {
  console.error('The DISCORD_TOKEN is not set in .env file.'.red);
  process.exit(1);
}

const bot = new Discord(process.env.DISCORD_TOKEN);

let channelIDs;
try {
  if (!fs.existsSync('channels.txt')) {
    throw new Error('channels.txt file does not exist.');
  }
  channelIDs = fs
    .readFileSync('channels.txt', 'utf-8')
    .split('\n')
    .filter(Boolean);
} catch (error) {
  console.error(error.message.red);
  process.exit(1);
}

// Fungsi untuk mengirim pesan terjadwal
// Menambahkan parameter delayPerChannelMs untuk menentukan penundaan antar channel
const sendCronMessage = (message, time, color, delayPerChannelMs = 1000) => { // Default 1000ms (1 detik)
  return new CronJob(
    time, // Waktu jadwal dalam format cron string (berdasarkan UTC)
    () => { // Fungsi yang akan dijalankan saat jadwal terpicu
      const sendMessageSequentially = (index = 0) => {
        // Hentikan jika semua channel sudah diproses
        if (index >= channelIDs.length) {
          console.log(`All messages for "${message}" sent.`.yellow);
          return;
        }

        const channelId = channelIDs[index];
        // Validasi ID channel
        if (!channelId.match(/^\d+$/)) {
          console.error(
            `Invalid channel ID "${channelId}" found in channels.txt`.red
          );
          // Lanjutkan ke channel berikutnya jika ID tidak valid
          return sendMessageSequentially(index + 1);
        }

        // Kirim pesan ke channel saat ini
        bot
          .sendMessageToChannel(channelId, message)
          .then((res) => { // Jika pesan berhasil dikirim
            const loessage = `Channel ID : ${channelId} | Message : ${
              res.content
            } | Date : ${new Date().toUTCString()}`;
            console.log(loessage[color]); // Log ke konsol dengan warna
            // Tulis log ke file logs.txt
            fs.appendFile('logs.txt', loessage + '\n', (err) => {
              if (err) console.error('Failed to write to logs.txt'.red, err);
            });
          })
          .catch((err) => { // Jika pesan gagal dikirim
            const errorLog = `Failed to send message to channel ${channelId} | Date : ${new Date().toUTCString()} | Error : ${
              err.response.data.message
            }`;
            console.error(errorLog.red); // Log error ke konsol
            // Tulis log error ke file logs.txt
            fs.appendFile('logs.txt', errorLog + '\n', (err) => {
              if (err) console.error('Failed to write to logs.txt'.red, err);
            });
          })
          .finally(() => {
            // Tunggu selama 'delayPerChannelMs' sebelum mencoba channel berikutnya
            setTimeout(() => sendMessageSequentially(index + 1), delayPerChannelMs);
          });
      };

      // Mulai proses pengiriman pesan berurutan
      sendMessageSequentially();
    },
    null, // Fungsi yang dipanggil saat job selesai (tidak digunakan di sini)
    true, // Langsung mulai job setelah dibuat
    'UTC' // Zona waktu untuk jadwal cron
  );
};

// --- Definisi Cron Jobs ---
// Penting: Waktu cron dihitung berdasarkan UTC. Sesuaikan dengan selisih waktu WIB (UTC+7).

// Mengatur pesan '!daily' pada jam 8:00 WIB (ini sama dengan 01:00 UTC)
// Cooldown antar channel untuk !daily adalah 1000 milidetik (1 detik)
const Job = sendCronMessage('!daily', '0 1 * * *', 'green', 1000);

// Mengatur pesan '!achievements' pada jam 9:00 WIB (ini sama dengan 02:00 UTC)
// Cooldown antar channel untuk !achievements adalah 2000 milidetik (2 detik)
const gnJob = sendCronMessage('!achievements', '0 2 * * *', 'blue', 2000);

// --- Memulai Cron Jobs ---
Job.start();
gnJob.start();

console.log('Cron jobs started.'.yellow);
