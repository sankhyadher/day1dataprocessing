let files = [];
let results = [];

document.addEventListener("DOMContentLoaded", () => {

    const fileInput = document.getElementById("files");
    const processBtn = document.getElementById("processBtn");
    const downloadBtn = document.getElementById("downloadBtn");

    fileInput.addEventListener("change", e => {
        files = Array.from(e.target.files);
        document.getElementById("fileInfo").textContent = files.length + " files selected";
        processBtn.disabled = files.length === 0;
    });

    processBtn.addEventListener("click", processAllFiles);
    downloadBtn.addEventListener("click", downloadCSV);
});

async function processAllFiles() {
    results = [];
    document.getElementById("downloadBtn").style.display = "none";

    for (let i = 0; i < files.length; i++) {
        updateProgress(i + 1, files.length);
        const data = await parseCSV(files[i]);
        const metrics = extractMetrics(files[i].name, data);
        results.push(metrics);
    }

    document.getElementById("progress").innerHTML = "";
    showResults();
    document.getElementById("downloadBtn").style.display = "inline-block";
}

function updateProgress(count, total) {
    const pct = Math.round((count / total) * 100);
    document.getElementById("progress").innerHTML =
        `<div class="progress"><div class="progress-bar" style="width:${pct}%">${pct}%</div></div>`;
}

// CSV parsing
function parseCSV(file) {
    return new Promise(resolve => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: r => resolve(r.data)
        });
    });
}

// MAIN EXTRACTION LOGIC
function extractMetrics(filename, data) {

    const id = filename.replace(/\.(csv|txt)$/i, "").replace("_period_analysis_summary", "");
    const name = id;

    // Remove Duration column
    data = data.map(row => {
        if (!row) return row;
        delete row["Duration"];
        delete row["duration"];
        return row;
    });

    if (!data || data.length < 8) {
        return { id, name, baseline:{}, conditioning:{}, pgq:{} };
    }

    // Row mapping based on screenshot:
    // data[0] = Baseline
    // data[1] = Question (ignored)
    // data[2]..data[6] = C1..C5 (conditioning rows)
    // data[7] = PGQ
    const baseline = data[0];
    const conditioningRows = data.slice(2, 7);
    const pgq = data[7];

    function findColumn(row, key) {
        if (!row) return null;
        key = key.toLowerCase();
        return Object.keys(row).find(k => k.toLowerCase().includes(key));
    }

    function singleMetric(row, key) {
        if (!row) return "N/A";
        const col = findColumn(row, key);
        return col ? row[col] : "N/A";
    }

    function meanMetric(rows, key) {
        if (!rows || rows.length === 0) return "N/A";
        const col = findColumn(rows[0], key);
        if (!col) return "N/A";
        const nums = rows.map(r => Number(r[col]) || 0);
        const mean = nums.reduce((a,b) => a+b, 0) / nums.length;
        return mean.toFixed(6);
    }

    return {
        id,
        name,
        baseline: {
            meanSCL: singleMetric(baseline, "mean scl"),
            meanSCR: singleMetric(baseline, "mean scr"),
            scrFreq: singleMetric(baseline, "scr freq"),
            totalSCR: singleMetric(baseline, "total scr"),
            sclSlope: singleMetric(baseline, "scl slope"),
            nsSCL: singleMetric(baseline, "ns-scl"),
            sclStd: singleMetric(baseline, "scl std"),
            scrStd: singleMetric(baseline, "scr std")
        },
        conditioning: {
            meanSCL: meanMetric(conditioningRows, "mean scl"),
            meanSCR: meanMetric(conditioningRows, "mean scr"),
            scrFreq: meanMetric(conditioningRows, "scr freq"),
            totalSCR: meanMetric(conditioningRows, "total scr"),
            sclSlope: meanMetric(conditioningRows, "scl slope"),
            nsSCL: meanMetric(conditioningRows, "ns-scl"),
            sclStd: meanMetric(conditioningRows, "scl std"),
            scrStd: meanMetric(conditioningRows, "scr std")
        },
        pgq: {
            meanSCL: singleMetric(pgq, "mean scl"),
            meanSCR: singleMetric(pgq, "mean scr"),
            scrFreq: singleMetric(pgq, "scr freq"),
            totalSCR: singleMetric(pgq, "total scr"),
            sclSlope: singleMetric(pgq, "scl slope"),
            nsSCL: singleMetric(pgq, "ns-scl"),
            sclStd: singleMetric(pgq, "scl std"),
            scrStd: singleMetric(pgq, "scr std")
        }
    };
}

// TABLE PREVIEW
function showResults() {
    if (!results || results.length === 0) {
        document.getElementById("results").innerHTML = "";
        return;
    }

    let html = `
    <h3>Preview (first 10 participants)</h3>
    <table>
        <thead>
            <tr>
                <th>ID</th><th>NAME</th>
                <th>Mean SCL BASE</th><th>Mean SCL COND</th><th>Mean SCL PGQ</th>
                <th>Mean SCR BASE</th><th>Mean SCR COND</th><th>Mean SCR PGQ</th>
                <th>SCR Freq BASE</th><th>SCR Freq COND</th><th>SCR Freq PGQ</th>
                <th>Total SCR BASE</th><th>Total SCR COND</th><th>Total SCR PGQ</th>
                <th>SCL Slope BASE</th><th>SCL Slope COND</th><th>SCL Slope PGQ</th>
                <th>NS-SCL BASE</th><th>NS-SCL COND</th><th>NS-SCL PGQ</th>
                <th>SCL Std BASE</th><th>SCL Std COND</th><th>SCL Std PGQ</th>
                <th>SCR Std BASE</th><th>SCR Std COND</th><th>SCR Std PGQ</th>
            </tr>
        </thead><tbody>
    `;

    results.slice(0, 10).forEach(r => {
        html += `
        <tr>
            <td>${r.id}</td><td>${r.name}</td>
            <td>${r.baseline.meanSCL}</td><td>${r.conditioning.meanSCL}</td><td>${r.pgq.meanSCL}</td>
            <td>${r.baseline.meanSCR}</td><td>${r.conditioning.meanSCR}</td><td>${r.pgq.meanSCR}</td>
            <td>${r.baseline.scrFreq}</td><td>${r.conditioning.scrFreq}</td><td>${r.pgq.scrFreq}</td>
            <td>${r.baseline.totalSCR}</td><td>${r.conditioning.totalSCR}</td><td>${r.pgq.totalSCR}</td>
            <td>${r.baseline.sclSlope}</td><td>${r.conditioning.sclSlope}</td><td>${r.pgq.sclSlope}</td>
            <td>${r.baseline.nsSCL}</td><td>${r.conditioning.nsSCL}</td><td>${r.pgq.nsSCL}</td>
            <td>${r.baseline.sclStd}</td><td>${r.conditioning.sclStd}</td><td>${r.pgq.sclStd}</td>
            <td>${r.baseline.scrStd}</td><td>${r.conditioning.scrStd}</td><td>${r.pgq.scrStd}</td>
        </tr>`;
    });

    html += "</tbody></table>";
    document.getElementById("results").innerHTML = html;
}

// CSV DOWNLOAD
function downloadCSV() {
    if (!results || results.length === 0) return;

    const header = [
        "id","NAME",
        "Mean SCL BASE","Mean SCL COND","Mean SCL PGQ",
        "Mean SCR BASE","Mean SCR COND","Mean SCR PGQ",
        "SCR Freq BASE","SCR Freq COND","SCR Freq PGQ",
        "Total SCR BASE","Total SCR COND","Total SCR PGQ",
        "SCL Slope BASE","SCL Slope COND","SCL Slope PGQ",
        "NS-SCL BASE","NS-SCL COND","NS-SCL PGQ",
        "SCL Std BASE","SCL Std COND","SCL Std PGQ",
        "SCR Std BASE","SCR Std COND","SCR Std PGQ"
    ];

    const rows = results.map(r => [
        r.id, r.name,
        r.baseline.meanSCL, r.conditioning.meanSCL, r.pgq.meanSCL,
        r.baseline.meanSCR, r.conditioning.meanSCR, r.pgq.meanSCR,
        r.baseline.scrFreq, r.conditioning.scrFreq, r.pgq.scrFreq,
        r.baseline.totalSCR, r.conditioning.totalSCR, r.pgq.totalSCR,
        r.baseline.sclSlope, r.conditioning.sclSlope, r.pgq.sclSlope,
        r.baseline.nsSCL, r.conditioning.nsSCL, r.pgq.nsSCL,
        r.baseline.sclStd, r.conditioning.sclStd, r.pgq.sclStd,
        r.baseline.scrStd, r.conditioning.scrStd, r.pgq.scrStd
    ]);

    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "EDA_MASTER_SHEET.csv";
    link.click();
}
