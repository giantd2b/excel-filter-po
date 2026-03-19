const functions = require("firebase-functions");
const admin = require("firebase-admin");
const linemsg = require("./linemsg");

const firestore = admin.firestore();

/**
 * Scheduled Cloud Function: runs at midnight Bangkok time every day.
 * Queries today's detected slips and sends a summary to the LINE group.
 */
exports.dailySlipReport = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone("Asia/Bangkok")
  .onRun(async () => {
    // Build start/end of "yesterday" in Bangkok time (the day that just ended)
    const now = new Date();
    // Convert to Bangkok time offset
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokNow = new Date(now.getTime() + bangkokOffset);
    // Go back 1 day (report for the day that just ended)
    const reportDate = new Date(bangkokNow);
    reportDate.setDate(reportDate.getDate() - 1);

    const year = reportDate.getUTCFullYear();
    const month = reportDate.getUTCMonth();
    const day = reportDate.getUTCDate();

    // Start and end of the report day in UTC
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0) - bangkokOffset);
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - bangkokOffset);

    const snapshot = await firestore
      .collection("link")
      .where("detected_at", ">=", admin.firestore.Timestamp.fromDate(startOfDay))
      .where("detected_at", "<=", admin.firestore.Timestamp.fromDate(endOfDay))
      .orderBy("detected_at", "desc")
      .get();

    if (snapshot.empty) {
      console.log("No slips found for the report day.");
      return null;
    }

    let totalAmount = 0;
    const bankMap = {}; // bank_name -> { count, amount }

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const amount = data.amount ? Number(data.amount) : 0;
      totalAmount += amount;

      const bank = data.bank_name || "ไม่ระบุ";
      if (!bankMap[bank]) {
        bankMap[bank] = { count: 0, amount: 0 };
      }
      bankMap[bank].count += 1;
      bankMap[bank].amount += amount;
    });

    // Format date as DD/MM/BBBB (Buddhist Era)
    const dd = String(day).padStart(2, "0");
    const mm = String(month + 1).padStart(2, "0");
    const buddhistYear = year + 543;

    const formatNum = (n) =>
      n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Build summary message
    const lines = [
      `สรุปสลิปประจำวัน ${dd}/${mm}/${buddhistYear}`,
      "===========================",
      `สลิปทั้งหมด: ${snapshot.size} รายการ`,
      `ยอดรวม: ${formatNum(totalAmount)} บาท`,
      "===========================",
    ];

    // Sort banks by amount descending
    const sortedBanks = Object.entries(bankMap).sort(
      (a, b) => b[1].amount - a[1].amount
    );

    for (const [bank, stats] of sortedBanks) {
      lines.push(`${bank}: ${stats.count} รายการ (${formatNum(stats.amount)})`);
    }

    const message = lines.join("\n");
    console.log("Daily slip report:\n", message);

    linemsg.pushgroup(message);

    return null;
  });
