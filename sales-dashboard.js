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

function filteredRecords() {
  const year = el("yearFilter").value, region = el("regionFilter").value, category = el("categoryFilter").value;
  return records.filter(r => (year === "all" || r.year === year) && (region === "all" || r.region === region) && (category === "all" || r.category === category));
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
    plugins:{legend:{labels:{color:"#a1aec2",usePointStyle:true,boxWidth:8,font:{family:"Manrope",size:11}}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label || ctx.label}: ${money(ctx.parsed.y ?? ctx.parsed)}`}}},
    scales:{x:{ticks:{color:"#a1aec2",maxRotation:0,autoSkip:true},grid:{color:"rgba(177,197,224,.07)"}},y:{ticks:{color:"#a1aec2",callback:value=>value>=1000000?(value/1000000).toFixed(1)+"M":value>=1000?(value/1000).toFixed(0)+"k":value},grid:{color:"rgba(177,197,224,.09)"}}}
  };
}
function createCharts() {
  if (!window.Chart) {
    document.querySelectorAll(".chart-wrap").forEach(w=>w.innerHTML="<p>Charts need an internet connection to load the chart library. The KPI calculations and table can still be used.</p>");
    return;
  }
  const base = chartBaseOptions();
  monthlyChart = new Chart(el("monthlyChart"), {type:"line",data:{labels:[],datasets:[{label:"Sales",data:[],borderColor:palette[0],backgroundColor:"rgba(100,230,208,.12)",fill:true,tension:.32,pointRadius:2}]},options:{...base,scales:{...base.scales,y:{...base.scales.y,beginAtZero:true}}}});
  regionChart = new Chart(el("regionChart"), {type:"bar",data:{labels:[],datasets:[{label:"Sales",data:[],backgroundColor:palette,borderRadius:5}]},options:{...base,indexAxis:"y",plugins:{...base.plugins,legend:{display:false}},scales:{x:{...base.scales.y,beginAtZero:true},y:{...base.scales.x,grid:{display:false}}}}});
  categoryChart = new Chart(el("categoryChart"), {type:"doughnut",data:{labels:[],datasets:[{label:"Profit",data:[],backgroundColor:palette,borderWidth:0,hoverOffset:7}]},options:{responsive:true,maintainAspectRatio:false,cutout:"65%",plugins:{legend:{position:"bottom",labels:{color:"#a1aec2",usePointStyle:true,boxWidth:8,padding:16,font:{family:"Manrope",size:10}}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${money(ctx.parsed)}`}}}}});
}
function updateDashboard() {
  const rows = filteredRecords();
  const sales = sum(rows,"sales"), profit = sum(rows,"profit");
  el("salesKpi").textContent = money(sales);
  el("profitKpi").textContent = money(profit);
  el("marginKpi").textContent = sales ? (profit/sales*100).toFixed(1)+"%" : "0.0%";
  el("ordersKpi").textContent = num(new Set(rows.map(r=>r.id)).size);
  const byMonth = grouped(rows,"month","sales");
  const monthKeys = Object.keys(byMonth).sort();
  if (monthlyChart) { monthlyChart.data.labels = monthKeys.map(k=>new Date(k+"-15").toLocaleDateString("en-IN",{month:"short",year:"2-digit"})); monthlyChart.data.datasets[0].data = monthKeys.map(k=>byMonth[k]); monthlyChart.update(); }
  const byRegion = grouped(rows,"region","sales");
  if (regionChart) { regionChart.data.labels = Object.keys(byRegion); regionChart.data.datasets[0].data = Object.values(byRegion); regionChart.data.datasets[0].backgroundColor = Object.keys(byRegion).map((_,i)=>palette[i%palette.length]); regionChart.update(); }
  const byCategory = grouped(rows,"category","profit");
  if (categoryChart) { categoryChart.data.labels = Object.keys(byCategory); categoryChart.data.datasets[0].data = Object.values(byCategory); categoryChart.update(); }
  const table = el("ordersTable"); table.innerHTML = "";
  rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).forEach(r=>{
    const tr = document.createElement("tr");
    [r.date,r.region,r.category,r.product,money(r.sales),money(r.profit)].forEach(value=>{const td=document.createElement("td");td.textContent=value;tr.appendChild(td);});
    table.appendChild(tr);
  });
  el("rowCount").textContent = `${rows.length} matching rows · showing ${Math.min(rows.length,12)}`;
}
["yearFilter","regionFilter","categoryFilter"].forEach(id=>el(id).addEventListener("change",updateDashboard));
el("resetFilters").addEventListener("click",()=>{["yearFilter","regionFilter","categoryFilter"].forEach(id=>el(id).value="all");updateDashboard();});
createCharts();
updateDashboard();
