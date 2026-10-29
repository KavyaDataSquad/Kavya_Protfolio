// Browser-only interactive dashboard. All values below are illustrative sample data.
const records = [];
const regions = ["North", "South", "East", "West"];
const categories = ["Technology", "Furniture", "Office Supplies"];
const products = {
  "Technology": ["Laptop", "Monitor", "Phone", "Tablet"],
  "Furniture": ["Desk", "Chair", "Bookcase", "Cabinet"],
  "Office Supplies": ["Paper", "Binder", "Pen Set", "Storage Box"]
};
const months = ["2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12"];
// Deterministic demo data (not random on page load).
months.forEach((month, mi) => {
  for (let j = 0; j < 14; j++) {
    const category = categories[(mi + j * 2) % categories.length];
    const region = regions[(mi * 3 + j) % regions.length];
    const product = products[category][(mi + j) % products[category].length];
    const base = 180 + ((mi * 173 + j * 97) % 1800);
    const sales = Math.round(base * (category === "Technology" ? 1.65 : category === "Furniture" ? 1.18 : 0.72));
    const margin = 0.08 + (((mi * 7 + j * 11) % 25) / 100);
    const profit = Math.round(sales * margin);
    records.push({ id: `ORD-${month.replace("-","")}-${String(j+1).padStart(2,"0")}`, date: `${month}-${String((j*2)%27+1).padStart(2,"0")}`, year: month.slice(0,4), month, region, category, product, sales, profit });
  }
});
const money = n => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const num = n => new Intl.NumberFormat("en-IN").format(n);
const el = id => document.getElementById(id);
const palette = ["#64e6d0","#7c9cff","#ffb86b","#d69cff"];
let monthlyChart, regionChart, categoryChart;
// Clicking a chart element applies a cross-filter, similar to Power BI.
// Clicking the same element again clears that chart's selection.
let visualSelection = { month: null, region: null, category: null };

function fillFilter(id, values) {
  const select = el(id);
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value; option.textContent = value;
    select.appendChild(option);
  });
}
fillFilter("yearFilter", [...new Set(records.map(r=>r.year))]);
fillFilter("regionFilter", regions);
fillFilter("categoryFilter", categories);

function filteredRecords(excludeVisualKey = null) {
  const year = el("yearFilter").value, region = el("regionFilter").value, category = el("categoryFilter").value;
  return records.filter(r =>
    (year === "all" || r.year === year) &&
    (region === "all" || r.region === region) &&
    (category === "all" || r.category === category) &&
    (excludeVisualKey === "month" || !visualSelection.month || r.month === visualSelection.month) &&
    (excludeVisualKey === "region" || !visualSelection.region || r.region === visualSelection.region) &&
    (excludeVisualKey === "category" || !visualSelection.category || r.category === visualSelection.category)
  );
}
function clearVisualSelection(key) {
  visualSelection[key] = null;
}
function chartClickSelection(key, value) {
  visualSelection[key] = visualSelection[key] === value ? null : value;
  updateDashboard();
}

function sum(rows, key) { return rows.reduce((total, r) => total + r[key], 0); }
function grouped(rows, key, valueKey) {
  const out = {};
  rows.forEach(r => { out[r[key]] = (out[r[key]] || 0) + r[valueKey]; });
  return out;
}
function chartBaseOptions() {
  return {
    responsive:true, maintainAspectRatio:false,
    // Nearest-point hit testing makes chart clicks easier to trigger.
    interaction:{mode:"nearest", intersect:false},
    plugins:{legend:{labels:{color:"#a1aec2",usePointStyle:true,boxWidth:8,font:{family:"Manrope",size:9}}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label || ctx.label}: ${money(ctx.parsed.y ?? ctx.parsed)}`}}},
    scales:{x:{ticks:{color:"#a1aec2",maxRotation:0,autoSkip:true,font:{size:9}},grid:{color:"rgba(177,197,224,.07)"}},y:{ticks:{color:"#a1aec2",callback:value=>value>=1000000?(value/1000000).toFixed(1)+"M":value>=1000?(value/1000).toFixed(0)+"k":value},grid:{color:"rgba(177,197,224,.09)"}}}
  };
}
function getClickedElement(event, chart, intersect = false) {
  // Explicit hit testing is more reliable across Chart.js versions than
  // relying on the default interaction mode.
  const hits = chart.getElementsAtEventForMode(
    event,
    "nearest",
    { intersect, axis: "xy" },
    true
  );
  return hits && hits.length ? hits[0] : null;
}
function createCharts() {
  if (!window.Chart) {
    document.querySelectorAll(".chart-wrap").forEach(w=>w.innerHTML="<p>Charts need an internet connection to load the chart library. The KPI calculations and table can still be used.</p>");
    return;
  }
  const base = chartBaseOptions();
  monthlyChart = new Chart(el("monthlyChart"), {
    type:"line",
    data:{labels:[],datasets:[{label:"Sales",data:[],borderColor:palette[0],backgroundColor:"rgba(100,230,208,.12)",fill:true,tension:.32,pointRadius:5,pointHoverRadius:8,hitRadius:14,borderWidth:2}]},
    options:{...base,scales:{...base.scales,y:{...base.scales.y,beginAtZero:true}},onClick:(event,elements,chart)=>{
      const hit = getClickedElement(event, chart, false);
      if (!hit) return;
      const month = chart.$monthKeys?.[hit.index];
      if (month) chartClickSelection("month", month);
    }}
  });
  regionChart = new Chart(el("regionChart"), {
    type:"bar",
    data:{labels:[],datasets:[{label:"Sales",data:[],backgroundColor:palette,borderRadius:5,barPercentage:.72,categoryPercentage:.78}]},
    options:{...base,indexAxis:"y",onClick:(event,elements,chart)=>{
      const hit = getClickedElement(event, chart, false);
      if (!hit) return;
      const region = chart.data.labels[hit.index];
      if (region) chartClickSelection("region", region);
    },plugins:{...base.plugins,legend:{display:false}},scales:{x:{...base.scales.y,beginAtZero:true},y:{...base.scales.x,grid:{display:false}}}}
  });
  categoryChart = new Chart(el("categoryChart"), {
    type:"doughnut",
    data:{labels:[],datasets:[{label:"Profit",data:[],backgroundColor:palette,borderWidth:2,borderColor:"#111a29",hoverOffset:9}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"68%",onClick:(event,elements,chart)=>{
      const hit = getClickedElement(event, chart, true);
      if (!hit) return;
      const category = chart.data.labels[hit.index];
      if (category) chartClickSelection("category", category);
    },plugins:{legend:{position:"bottom",labels:{color:"#a1aec2",usePointStyle:true,boxWidth:8,padding:16,font:{family:"Manrope",size:9}}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${money(ctx.parsed)}`}}}}
  });
  // Keyboard-accessible fallback: charts can be focused and Enter/Space clears
  // visual selections, while mouse/touch clicks select data points.
  ["monthlyChart","regionChart","categoryChart"].forEach(id=>{
    const canvas = el(id);
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "button");
    canvas.setAttribute("aria-label", canvas.getAttribute("aria-label") + ". Click a data point to cross-filter; press Enter to clear chart selections.");
    canvas.addEventListener("keydown", event=>{
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        visualSelection = { month:null, region:null, category:null };
        updateDashboard();
      }
    });
  });
}
function updateDashboard() {
  const rows = filteredRecords();
  const sales = sum(rows,"sales"), profit = sum(rows,"profit");
  const selectionText = [];
  if (visualSelection.month) selectionText.push("Month: " + visualSelection.month);
  if (visualSelection.region) selectionText.push("Region: " + visualSelection.region);
  if (visualSelection.category) selectionText.push("Category: " + visualSelection.category);
  let selectionBadge = document.getElementById("visualSelectionBadge");
  if (selectionBadge) {
    selectionBadge.textContent = selectionText.length ? "Visual filters: " + selectionText.join(" · ") : "No visual selection";
    selectionBadge.classList.toggle("active", selectionText.length > 0);
  }
  el("salesKpi").textContent = money(sales);
  el("profitKpi").textContent = money(profit);
  el("marginKpi").textContent = sales ? (profit/sales*100).toFixed(1)+"%" : "0.0%";
  el("ordersKpi").textContent = num(new Set(rows.map(r=>r.id)).size);
  const monthRows = filteredRecords("month");
  const byMonth = grouped(monthRows,"month","sales");
  const monthKeys = Object.keys(byMonth).sort();
  if (monthlyChart) {
    monthlyChart.data.labels = monthKeys.map(k=>new Date(k+"-15").toLocaleDateString("en-IN",{month:"short",year:"2-digit"}));
    monthlyChart.$monthKeys = monthKeys;
    monthlyChart.data.datasets[0].data = monthKeys.map(k=>byMonth[k]);
    monthlyChart.data.datasets[0].pointBackgroundColor = monthKeys.map(k=>!visualSelection.month || visualSelection.month===k ? palette[0] : "#455368");
    monthlyChart.update();
  }
  // Build each visual's categories from the other filters only, so selecting a
  // segment remains visible and can be toggled off by clicking it again.
  const regionRows = filteredRecords("region");
  const byRegion = grouped(regionRows,"region","sales");
  if (regionChart) {
    regionChart.data.labels = Object.keys(byRegion);
    regionChart.data.datasets[0].data = Object.values(byRegion);
    regionChart.data.datasets[0].backgroundColor = Object.keys(byRegion).map((r,i)=>visualSelection.region && visualSelection.region!==r ? "#455368" : palette[i%palette.length]);
    regionChart.update();
  }
  const categoryRows = filteredRecords("category");
  const byCategory = grouped(categoryRows,"category","profit");
  if (categoryChart) {
    categoryChart.data.labels = Object.keys(byCategory);
    categoryChart.data.datasets[0].data = Object.values(byCategory);
    categoryChart.data.datasets[0].backgroundColor = Object.keys(byCategory).map((c,i)=>visualSelection.category && visualSelection.category!==c ? "#455368" : palette[i%palette.length]);
    categoryChart.update();
  }
  const table = el("ordersTable"); table.innerHTML = "";
  rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).forEach(r=>{
    const tr = document.createElement("tr");
    [r.date,r.region,r.category,r.product,money(r.sales),money(r.profit)].forEach(value=>{const td=document.createElement("td");td.textContent=value;tr.appendChild(td);});
    table.appendChild(tr);
  });
  el("rowCount").textContent = `${rows.length} matching rows · showing ${Math.min(rows.length,12)}`;
}
["yearFilter","regionFilter","categoryFilter"].forEach(id=>el(id).addEventListener("change",updateDashboard));
el("resetFilters").addEventListener("click",()=>{
  ["yearFilter","regionFilter","categoryFilter"].forEach(id=>el(id).value="all");
  visualSelection = { month: null, region: null, category: null };
  updateDashboard();
});
createCharts();
updateDashboard();
