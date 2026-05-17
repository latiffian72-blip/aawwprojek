const { io } = require("socket.io-client");

console.log("=========================================");
console.log("🤖 MEMULAI SIMULATOR ESP32 (ASAP MONITOR)");
console.log("=========================================\n");
console.log("⏳ Mencoba terhubung ke http://localhost:3001...");

// 1. Konek ke Backend kampang
const socket = io("http://localhost:3001", {
  query: { device_id: "esp32_01" },
});

// matiin sek
let pumpOn = false;
let blowerOn = false;

socket.on("connect", () => {
  console.log("✅ BERHASIL! Simulator ESP32 terhubung ke Server.\n");

  setInterval(() => {
    const tds = (200 + Math.random() * 50).toFixed(2);
    const turbidity = (20 + Math.random() * 10).toFixed(2);
    const mq135 = (15 + Math.random() * 10).toFixed(2);
    const mq7 = (5 + Math.random() * 2).toFixed(2);
    const dust = (0.05 + Math.random() * 0.02).toFixed(3);

    const fakeData = {
      device_id: "esp32_01",
      readings: [
        { type: "TDS", value: parseFloat(tds), unit: "ppm" },
        { type: "TURBIDITY", value: parseFloat(turbidity), unit: "NTU" },
        { type: "MQ135", value: parseFloat(mq135), unit: "ppm" },
        { type: "MQ7", value: parseFloat(mq7), unit: "ppm" },
        { type: "DSM501A", value: parseFloat(dust), unit: "ug/m3" },
      ],
    };

    socket.emit("sensor_data", fakeData);

    process.stdout.write(
      `\r📤 TDS:${tds} Turb:${turbidity} MQ135:${mq135} MQ7:${mq7} Dust:${dust}   `,
    );
  }, 1000);

  // Kirim laporan status perangkat setiap 5 detik
  setInterval(() => {
    socket.emit("status_update", {
      pump: { status: pumpOn ? "ON" : "OFF", load: pumpOn ? 68 : 0 },
      blower: { status: blowerOn ? "ON" : "OFF", rpm: blowerOn ? 1650 : 0 },
    });
  }, 5000);
});

socket.on("command", (pesan) => {
  console.log(`\n\n🎮 MENDAPAT PERINTAH DARI WEBSITE: [${pesan.command}]`);

  if (pesan.command === "PUMP_ON") {
    pumpOn = true;
    console.log("⚙️  [FISIK] *Cetek!* Relay Pompa AKTIF.");
  } else if (pesan.command === "PUMP_OFF") {
    pumpOn = false;
    console.log("⚙️  [FISIK] *Cetek!* Relay Pompa MATI.");
  } else if (pesan.command === "BLOWER_ON") {
    blowerOn = true;
    console.log("⚙️  [FISIK] *Wushhh!* Relay Blower AKTIF.");
  } else if (pesan.command === "BLOWER_OFF") {
    blowerOn = false;
    console.log("⚙️  [FISIK] *Wushhh!* Relay Blower MATI.");
  }

  // Segera lapor balik ke server kalau alat sudah merespons perintah
  socket.emit("status_update", {
    pump: { status: pumpOn ? "ON" : "OFF", load: pumpOn ? 68 : 0 },
    blower: { status: blowerOn ? "ON" : "OFF", rpm: blowerOn ? 1650 : 0 },
  });
});

socket.on("disconnect", () => {
  console.log("\n❌ Terputus dari Server. Mencoba menyambung kembali...");
});

socket.on("connect_error", (err) => {
  console.log(`\n⚠️ Gagal terhubung: ${err.message}`);
  console.log(
    "💡 Tips: Pastikan Backend Node.js Anda sudah berjalan di port 3001.",
  );
});
