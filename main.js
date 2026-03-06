const fs = require("fs");


function getShiftDuration(startTime, endTime) {
    function timeToSeconds(timeStr) {
        let [time, period] = timeStr.split(" ");
        let [hours, minutes, seconds] = time.split(":").map(Number);

        if (period.toLowerCase() === "pm" && hours !== 12) {
            hours += 12;
        } else if (period.toLowerCase() === "am" && hours === 12) {
            hours = 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToTime(totalSeconds) {
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;

        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    let startSeconds = timeToSeconds(startTime);
    let endSeconds = timeToSeconds(endTime);

    if (endSeconds < startSeconds) {
        endSeconds += 24 * 3600;
    }

    let duration = endSeconds - startSeconds;
    return secondsToTime(duration);
}


function getIdleTime(startTime, endTime) {
    function timeToSeconds(timeStr) {
        let [time, period] = timeStr.split(" ");
        let [hours, minutes, seconds] = time.split(":").map(Number);

        if (period.toLowerCase() === "pm" && hours !== 12) {
            hours += 12;
        } else if (period.toLowerCase() === "am" && hours === 12) {
            hours = 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToTime(totalSeconds) {
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;

        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    let startSeconds = timeToSeconds(startTime);
    let endSeconds = timeToSeconds(endTime);

    if (endSeconds < startSeconds) {
        endSeconds += 24 * 3600;
    }

    const deliveryStart = 8 * 3600;
    const deliveryEnd = 22 * 3600;

    let idleSeconds = 0;

    if (startSeconds < deliveryStart) {
        idleSeconds += Math.min(endSeconds, deliveryStart) - startSeconds;
    }

    if (endSeconds > deliveryEnd) {
        idleSeconds += endSeconds - Math.max(startSeconds, deliveryEnd);
    }

    return secondsToTime(idleSeconds);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function timeToSeconds(timeStr) {
        let [hours, minutes, seconds] = timeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToTime(totalSeconds) {
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;

        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    let shiftSeconds = timeToSeconds(shiftDuration);
    let idleSeconds = timeToSeconds(idleTime);
    let activeSeconds = shiftSeconds - idleSeconds;

    return secondsToTime(activeSeconds);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    function timeToSeconds(timeStr) {
        let [hours, minutes, seconds] = timeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    let activeSeconds = timeToSeconds(activeTime);

    let quota = "8:24:00";
    if (date >= "2025-04-10" && date <= "2025-04-30") {
        quota = "6:00:00";
    }

    let quotaSeconds = timeToSeconds(quota);

    return activeSeconds >= quotaSeconds;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let fileData = fs.readFileSync(textFile, { encoding: "utf8" }).trim();
    let lines = fileData.split("\n");

    // Check for duplicate: same driverID and date
    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0] === shiftObj.driverID && cols[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quotaMet = metQuota(shiftObj.date, activeTime);

    let newRecordObj = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quotaMet,
        hasBonus: false
    };

    let newLine = [
        newRecordObj.driverID,
        newRecordObj.driverName,
        newRecordObj.date,
        newRecordObj.startTime,
        newRecordObj.endTime,
        newRecordObj.shiftDuration,
        newRecordObj.idleTime,
        newRecordObj.activeTime,
        newRecordObj.metQuota,
        newRecordObj.hasBonus
    ].join(",");

    // Insert after last record of same driverID, otherwise append
    let insertIndex = lines.length;
    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0] === shiftObj.driverID) {
            insertIndex = i + 1;
        }
    }

    lines.splice(insertIndex, 0, newLine);
    fs.writeFileSync(textFile, lines.join("\n"), { encoding: "utf8" });

    return newRecordObj;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let fileData = fs.readFileSync(textFile, { encoding: "utf8" }).trim();
    let lines = fileData.split("\n");

    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");

        if (cols[0] === driverID && cols[2] === date) {
            cols[9] = String(newValue);
            lines[i] = cols.join(",");
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"), { encoding: "utf8" });
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let fileData = fs.readFileSync(textFile, { encoding: "utf8" }).trim();
    let lines = fileData.split("\n");

    let targetMonth = String(month).padStart(2, "0");
    let driverFound = false;
    let bonusCount = 0;

    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        let recordDriverID = cols[0];
        let recordDate = cols[2];
        let recordMonth = recordDate.split("-")[1];
        let hasBonus = cols[9].trim() === "true";

        if (recordDriverID === driverID) {
            driverFound = true;

            if (recordMonth === targetMonth && hasBonus) {
                bonusCount++;
            }
        }
    }

    if (!driverFound) {
        return -1;
    }

    return bonusCount;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    function timeToSeconds(timeStr) {
        let [hours, minutes, seconds] = timeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToTime(totalSeconds) {
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;

        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    let fileData = fs.readFileSync(textFile, { encoding: "utf8" }).trim();
    let lines = fileData.split("\n");

    let targetMonth = String(month).padStart(2, "0");
    let totalSeconds = 0;

    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        let recordDriverID = cols[0];
        let recordMonth = cols[2].split("-")[1];
        let activeTime = cols[7];

        if (recordDriverID === driverID && recordMonth === targetMonth) {
            totalSeconds += timeToSeconds(activeTime);
        }
    }

    return secondsToTime(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    function timeToSeconds(timeStr) {
        let [hours, minutes, seconds] = timeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToTime(totalSeconds) {
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;

        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function getDayName(dateStr) {
    let [year, month, day] = dateStr.split("-").map(Number);
    let dateObj = new Date(year, month - 1, day);
    let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dateObj.getDay()];
}

    let rateData = fs.readFileSync(rateFile, { encoding: "utf8" }).trim().split("\n");
    let dayOff = "";

    for (let i = 0; i < rateData.length; i++) {
        let cols = rateData[i].split(",");
        if (cols[0] === driverID) {
            dayOff = cols[1].trim();
            break;
        }
    }

    let shiftData = fs.readFileSync(textFile, { encoding: "utf8" }).trim().split("\n");
    let targetMonth = String(month).padStart(2, "0");
    let totalSeconds = 0;

    for (let i = 1; i < shiftData.length; i++) {
        let cols = shiftData[i].split(",");
        let recordDriverID = cols[0];
        let recordDate = cols[2];
        let recordMonth = recordDate.split("-")[1];

        if (recordDriverID === driverID && recordMonth === targetMonth) {
            let dayName = getDayName(recordDate);

            if (dayName !== dayOff) {
                if (recordDate >= "2025-04-10" && recordDate <= "2025-04-30") {
                    totalSeconds += timeToSeconds("6:00:00");
                } else {
                    totalSeconds += timeToSeconds("8:24:00");
                }
            }
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;

    return secondsToTime(totalSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    function timeToSeconds(timeStr) {
        let [hours, minutes, seconds] = timeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    let rateData = fs.readFileSync(rateFile, { encoding: "utf8" }).trim().split("\n");
    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < rateData.length; i++) {
        let cols = rateData[i].split(",");
        if (cols[0] === driverID) {
            basePay = Number(cols[2]);
            tier = Number(cols[3]);
            break;
        }
    }

    let allowedMissingHours = 0;

    if (tier === 1) {
        allowedMissingHours = 50;
    } else if (tier === 2) {
        allowedMissingHours = 20;
    } else if (tier === 3) {
        allowedMissingHours = 10;
    } else if (tier === 4) {
        allowedMissingHours = 3;
    }

    let actualSeconds = timeToSeconds(actualHours);
    let requiredSeconds = timeToSeconds(requiredHours);

    if (actualSeconds >= requiredSeconds) {
        return basePay;
    }

    let missingSeconds = requiredSeconds - actualSeconds;
    let allowedSeconds = allowedMissingHours * 3600;
    let billableSeconds = missingSeconds - allowedSeconds;

    if (billableSeconds <= 0) {
        return basePay;
    }

    let billableHours = Math.floor(billableSeconds / 3600);
    let deductionRatePerHour = Math.floor(basePay / 185);
    let salaryDeduction = billableHours * deductionRatePerHour;

    return basePay - salaryDeduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};



