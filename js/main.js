const API = "https://baratek.onrender.com/analyze-dataset";
const form = document.getElementById("health-form");

if (form) {
  const msg = document.getElementById("form-msg");
  const btn = document.getElementById("submit-btn");
  const results = document.getElementById("health-results");
  const $ = (id) => document.getElementById(id);

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function show(text, isError) {
    msg.textContent = text;
    msg.className = "msg" + (isError ? " error" : "");
    msg.hidden = false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.hidden = true;

    const fields = {
      name: $("name"),
      company: $("company"),
      email: $("email"),
      dataType: $("data-type"),
      problem: $("problem"),
    };
    const file = $("dataset").files[0];

    for (const input of Object.values(fields)) {
      if (!input.value.trim()) {
        input.focus();
        return show("Please fill in every box. The empty one is highlighted.", true);
      }
    }
    if (!fields.email.checkValidity()) {
      fields.email.focus();
      return show("That email address doesn't look right. Check it and try again.", true);
    }
    if (!file) return show("Please choose your spreadsheet. It must be a CSV file.", true);

    const data = new FormData();
    for (const [k, input] of Object.entries(fields)) data.append(k, input.value.trim());
    data.append("file", file);

    btn.disabled = true;
    btn.textContent = "Checking your data...";
    show("Checking your data. The first check can take up to a minute while our server wakes up.");

    try {
      const res = await fetch(API, { method: "POST", body: data });
      if (!res.ok) {
        let detail = "";
        try { detail = (await res.json()).detail; } catch (_) {}
        throw new Error(typeof detail === "string" ? detail : "");
      }
      const r = await res.json();

      const issues = r.missing_values + r.duplicate_rows;
      $("verdict").textContent =
        issues === 0
          ? "Good news: we found no missing values or duplicate rows."
          : `Your data is ${r.completeness}% complete. We found ${r.missing_values.toLocaleString()} missing values and ${r.duplicate_rows.toLocaleString()} duplicate rows.`;

      $("result-filename").textContent = r.filename;
      $("result-rows").textContent = r.rows.toLocaleString();
      $("result-columns").textContent = r.columns;
      $("result-completeness").textContent = r.completeness + "%";
      $("result-missing").textContent = r.missing_values.toLocaleString();
      $("result-duplicates").textContent = r.duplicate_rows.toLocaleString();

      let rows = "";
      for (const [col, c] of Object.entries(r.column_report)) {
        const cls = c.missing_values ? "warn" : "ok";
        rows += `<tr><td>${esc(col)}</td><td>${esc(c.data_type)}</td><td>${c.missing_values}</td><td class="${cls}">${c.missing_percentage}%</td></tr>`;
      }
      $("column-results").innerHTML =
        `<table><thead><tr><th>Column</th><th>Data type</th><th>Missing values</th><th>Missing</th></tr></thead><tbody>${rows}</tbody></table>`;

      msg.hidden = true;
      results.hidden = false;
      results.scrollIntoView({ behavior: "smooth" });
      results.focus({ preventScroll: true });
    } catch (err) {
      console.error(err);
      show(err.message || "We couldn't check your file. Make sure it is a CSV with a header row, then try again.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Check my data";
    }
  });
}
