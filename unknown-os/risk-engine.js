/* UNKNOWN OS · Account Risk Engine
   Enforces account-risk caps using manually logged phase P&L.
   Phase 1/2 hard limit: -6%; preserve a 0.25% buffer.
*/
(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const money = n => (n > 0 ? "+" : "") + Number(n || 0).toFixed(2) + "%";
  const floor2 = n => Math.floor((n + 1e-9) * 100) / 100;

  function mentalCap(){
    try {
      const v = String(state()[1] || "0%").replace("%","");
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0,n) : 0;
    } catch (_) { return 0; }
  }

  function accountRisk(phase){
    phase = Number(phase || ($("#phase") && $("#phase").value) || 1);
    const pnl = typeof phasePnl === "function" ? Number(phasePnl(phase) || 0) : 0;
    const capMental = mentalCap();
    let tierCap, marginCap = 1, blocked = false, reason = "";

    if (phase === 3) {
      // REAL account: use the app's conservative 0.50% base; do not assume challenge rules.
      tierCap = 0.50;
      reason = "Cuenta REAL: tope conservador de 0.50%; configura las reglas reales del broker por separado.";
    } else {
      if (pnl <= -6) {
        blocked = true; tierCap = 0; marginCap = 0;
        reason = "LÍMITE ABSOLUTO DE −6.00% ALCANZADO. Fase bloqueada.";
      } else {
        tierCap = pnl >= 3 ? 1.00 : pnl >= -2 ? 0.50 : pnl >= -4 ? 0.33 : 0.25;
        const remaining = 6 + pnl;
        // Keep 0.25% as a safety reserve: at -5.50%, cap remains 0.25%;
        // at -5.75%, no risk remains authorized.
        marginCap = floor2(Math.max(0, remaining - 0.25));
        if (pnl <= -5.75 || marginCap <= 0) {
          blocked = true; tierCap = 0; marginCap = 0;
          reason = "Margen insuficiente: se conserva un buffer de 0.25% antes del límite de −6%.";
        } else if (pnl <= -5) {
          reason = "Zona crítica: máximo 0.25% y buffer de seguridad hasta −6%.";
        } else if (pnl <= -3) {
          reason = "Drawdown: máximo 0.33% por operación.";
        } else if (pnl >= 3) {
          reason = "Objetivo de +3% alcanzado: hasta 1% solo si el estado mental lo permite.";
        } else {
          reason = "Riesgo limitado por la zona de cuenta y el estado mental.";
        }
      }
    }

    const maxRisk = blocked ? 0 : floor2(Math.min(capMental, tierCap, marginCap));
    const effectiveReason = blocked ? reason : (capMental <= 0
      ? "Sin autorización mental vigente: completa el chequeo y calcula el estado."
      : reason + " El motor aplica el menor entre riesgo mental, zona de cuenta y margen restante.");
    return {phase,pnl,remaining: phase===3 ? null : Math.max(0,6+pnl),mentalCap:capMental,tierCap,marginCap,maxRisk,blocked:blocked||maxRisk<=0,reason:effectiveReason};
  }

  function ensurePanel(){
    if ($("#accountRiskPanel")) return $("#accountRiskPanel");
    const form = $("#tradeForm");
    const submit = form && form.querySelector('button[type="submit"]');
    if (!form || !submit) return null;
    const panel = document.createElement("div");
    panel.id = "accountRiskPanel";
    panel.innerHTML = `
      <div class="are-head"><span>ACCOUNT RISK ENGINE</span><b id="areStatus">CALCULATING</b></div>
      <div class="are-grid">
        <div><small>PHASE P&L</small><strong id="arePnl">—</strong></div>
        <div><small>TO −6% LIMIT</small><strong id="areRemaining">—</strong></div>
        <div><small>MENTAL CAP</small><strong id="areMental">—</strong></div>
        <div><small>MAX AUTHORIZED</small><strong id="areMax">—</strong></div>
      </div>
      <p id="areReason">El riesgo se calcula con las operaciones registradas manualmente.</p>
      <small class="are-foot">Cálculo basado en tu registro, no en el balance en vivo del broker. Slippage y pérdidas mayores al riesgo previsto pueden superar el límite.</small>`;
    form.insertBefore(panel, submit);
    return panel;
  }

  function updatePanel(){
    const panel = ensurePanel();
    if (!panel) return;
    const r = accountRisk($("#phase") ? $("#phase").value : 1);
    $("#areStatus").textContent = r.blocked ? "BLOCKED" : "AUTHORIZED";
    $("#areStatus").className = r.blocked ? "blocked" : "";
    $("#arePnl").textContent = money(r.pnl);
    $("#areRemaining").textContent = r.remaining === null ? "N/A" : money(r.remaining);
    $("#areMental").textContent = r.mentalCap.toFixed(2) + "%";
    $("#areMax").textContent = r.maxRisk.toFixed(2) + "%";
    $("#areReason").textContent = r.reason;
    $("#areMax").className = r.blocked ? "blocked" : "";
    const input = $("#trisk");
    if (input) {
      input.max = r.maxRisk.toFixed(2);
      if (Number(input.value) > r.maxRisk + 1e-9) input.value = r.maxRisk.toFixed(2);
    }
    const label = $("#formRisk");
    if (label) label.textContent = "MAX RISK " + r.maxRisk.toFixed(2) + "%";
    panel.style.borderColor = r.blocked ? "#58343a" : "#303030";
  }

  const style = document.createElement("style");
  style.textContent = `
    #accountRiskPanel{border:1px solid #303030;background:#080808;padding:15px;margin:6px 0 15px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
    .are-head{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:8px;letter-spacing:.15em;color:#777}
    .are-head b{color:#eee;font-size:8px}.are-head b.blocked,#areMax.blocked{color:#ff9ca8}
    .are-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:13px}
    .are-grid>div{border:1px solid #202020;padding:10px;min-width:0}
    .are-grid small{display:block;color:#606060;font-size:7px;letter-spacing:.1em}
    .are-grid strong{display:block;color:#eee;font-size:15px;margin-top:7px;overflow-wrap:anywhere}
    #areReason{font-size:9px;color:#aaa;line-height:1.5;margin:12px 0 5px}
    .are-foot{display:block;font-size:7px;line-height:1.5;color:#555}
    @media(max-width:520px){.are-grid{grid-template-columns:1fr 1fr}.are-grid strong{font-size:13px}}
  `;
  document.head.appendChild(style);

  // Recalculate when phase or risk changes.
  if ($("#phase")) $("#phase").addEventListener("change", updatePanel);
  if ($("#trisk")) $("#trisk").addEventListener("input", () => {
    const r = accountRisk($("#phase").value);
    if (Number($("#trisk").value) > r.maxRisk) $("#trisk").value = r.maxRisk.toFixed(2);
    updatePanel();
  });

  // A changed mental check invalidates the previous authorization until recalculated.
  const invalidateCheck = () => {
    if (typeof D !== "undefined" && D.checkin) {
      D.checkin = null;
      if (typeof save === "function") save();
      if (typeof render === "function") render();
      updatePanel();
    }
  };
  ["stress","anxiety","energy","confidence","urgency"].forEach(id => {
    const el = $("#"+id);
    if (el) el.addEventListener("change", invalidateCheck);
  });
  document.querySelectorAll(".yn").forEach(el => el.addEventListener("click", invalidateCheck));

  // Gate form submission before the existing handler can record a trade.
  const form = $("#tradeForm");
  if (form) form.addEventListener("submit", function(e){
    const r = accountRisk($("#phase").value);
    const requested = Number($("#trisk").value);
    if (r.blocked || !Number.isFinite(requested) || requested <= 0 || requested > r.maxRisk + 1e-9) {
      e.preventDefault();
      e.stopImmediatePropagation();
      updatePanel();
      alert(r.blocked
        ? "OPERACIÓN BLOQUEADA. El motor no autoriza riesgo con el estado mental o el margen actual de la cuenta."
        : "Riesgo superior al máximo autorizado (" + r.maxRisk.toFixed(2) + "%). El motor ajustó el campo; revisa la operación antes de registrarla.");
    }
  }, true);

  // Wrap render so the cap stays current after saves, deletions, imports and cloud hydration.
  if (typeof window.render === "function") {
    const originalRender = window.render;
    window.render = function(){ originalRender.apply(this, arguments); updatePanel(); };
  }
  window.unknownOSAccountRisk = accountRisk;
  updatePanel();
  if (typeof render === "function") render();
})();