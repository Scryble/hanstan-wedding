/* ════════════════════════════════════════════════════════════════════════════════
   STAGE 3 PHASE C — ASQ ("Ask a Question") public form
   Self-contained: injects floating button + modal on whatever page loads it.
   Lives next to any public page; included via <script src="/asq-form.js" defer>.
   POSTs to /.netlify/functions/public-contact which writes a state.notes[] entry
   and forwards via Zoho to stan@ + hannah@ (which forward to personal Gmails).

   Visual language matches Rivendell Garden v1.1 — gold accents, cream cards,
   deep-forest text, generous spacing, Georgia serif headings. Honors prefers-
   reduced-motion and prefers-color-scheme implicitly via the existing site CSS;
   uses inline scoped styles so the form looks consistent across faq/, registry/,
   and index.html without depending on those pages' CSS.

   Author: Stage 3 Phase C Claude (2026-04-26).
   ──────────────────────────────────────────────────────────────────────────── */
(function(){
  if (window.__hansAsqLoaded) return;
  window.__hansAsqLoaded = true;

  // Derive pageId from URL pathname so notes know which page they came from
  function derivePageId(){
    var path = window.location.pathname || "/";
    if (path === "/" || path === "/index.html") return "home";
    return path.replace(/^\/|\/$/g, "").replace(/\//g, "-").replace(/\.html$/, "") || "home";
  }
  var pageId = derivePageId();

  // Inject scoped CSS
  var css = ''
    + '.hans-asq-fab{position:fixed;right:20px;bottom:20px;z-index:9000;background:#c19a3c;color:#fff;border:none;border-radius:999px;padding:12px 20px;font-family:Georgia,serif;font-size:15px;font-weight:500;letter-spacing:0.02em;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.18);transition:transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;}'
    + '.hans-asq-fab:hover{background:#8a6d22;transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,0.22);}'
    + '.hans-asq-fab:focus{outline:2px solid #ead89b;outline-offset:2px;}'
    + '.hans-asq-overlay{position:fixed;inset:0;background:rgba(29,45,38,0.55);z-index:9001;display:none;align-items:center;justify-content:center;padding:20px;}'
    + '.hans-asq-overlay.open{display:flex;}'
    + '.hans-asq-modal{background:#faf9ef;border-radius:14px;padding:28px;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.28);font-family:Georgia,serif;color:#1d2d26;animation:hansAsqIn 0.22s ease;}'
    + '@keyframes hansAsqIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}'
    + '.hans-asq-title{font-size:22px;color:#445a4f;margin:0 0 6px;letter-spacing:0.01em;}'
    + '.hans-asq-sub{font-size:14px;color:#78867c;margin:0 0 22px;line-height:1.55;}'
    + '.hans-asq-field{display:flex;flex-direction:column;margin-bottom:14px;}'
    + '.hans-asq-label{font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#78867c;margin-bottom:5px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}'
    + '.hans-asq-input,.hans-asq-textarea{background:#e6ebe1;border:1px solid #d6d6c5;border-radius:8px;padding:10px 12px;font-family:inherit;font-size:15px;color:#1d2d26;line-height:1.5;}'
    + '.hans-asq-input:focus,.hans-asq-textarea:focus{outline:none;border-color:#c19a3c;background:#faf9ef;}'
    + '.hans-asq-textarea{resize:vertical;min-height:120px;font-family:Georgia,serif;}'
    + '.hans-asq-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;}'
    + '.hans-asq-btn{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;padding:10px 18px;border-radius:8px;cursor:pointer;border:1px solid #d6d6c5;background:transparent;color:#445a4f;transition:background 0.18s ease, border-color 0.18s ease;}'
    + '.hans-asq-btn:hover{background:rgba(193,154,60,0.06);border-color:#ead89b;}'
    + '.hans-asq-btn.primary{background:#c19a3c;color:#fff;border-color:#8a6d22;font-weight:500;}'
    + '.hans-asq-btn.primary:hover{background:#8a6d22;}'
    + '.hans-asq-btn:disabled{opacity:0.55;cursor:not-allowed;}'
    + '.hans-asq-success{text-align:center;padding:20px 10px;}'
    + '.hans-asq-success-icon{font-size:48px;margin-bottom:12px;}'
    + '.hans-asq-success-title{font-size:20px;color:#445a4f;margin:0 0 8px;}'
    + '.hans-asq-success-sub{font-size:14px;color:#78867c;line-height:1.6;}'
    + '.hans-asq-error{font-size:13px;color:#8a3a3a;background:rgba(185,74,74,0.08);border:1px solid rgba(185,74,74,0.4);border-radius:6px;padding:8px 12px;margin-top:6px;}'
    + '@media (max-width:480px){.hans-asq-fab{right:14px;bottom:14px;padding:11px 18px;font-size:14px;}.hans-asq-modal{padding:22px;}}';
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Build button + modal
  var btn = document.createElement("button");
  btn.className = "hans-asq-fab";
  btn.textContent = "Ask a question";
  btn.setAttribute("aria-label", "Ask the bride and groom a question");
  document.body.appendChild(btn);

  var overlay = document.createElement("div");
  overlay.className = "hans-asq-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Ask a question");
  overlay.innerHTML = ''
    + '<div class="hans-asq-modal" id="hansAsqModal">'
    + '<h2 class="hans-asq-title">Ask us anything</h2>'
    + '<p class="hans-asq-sub">Stan & Hannah will see this in their inbox and reply by email. Promise it goes to humans, not robots.</p>'
    + '<div class="hans-asq-field"><label class="hans-asq-label" for="hansAsqName">Your name</label><input id="hansAsqName" class="hans-asq-input" type="text" autocomplete="name" maxlength="100"></div>'
    + '<div class="hans-asq-field"><label class="hans-asq-label" for="hansAsqEmail">Your email</label><input id="hansAsqEmail" class="hans-asq-input" type="email" autocomplete="email" maxlength="200"></div>'
    + '<div class="hans-asq-field"><label class="hans-asq-label" for="hansAsqMessage">Your question</label><textarea id="hansAsqMessage" class="hans-asq-textarea" maxlength="4000"></textarea></div>'
    + '<div class="hans-asq-error" id="hansAsqError" style="display:none"></div>'
    + '<div class="hans-asq-actions"><button class="hans-asq-btn" id="hansAsqCancel" type="button">Cancel</button><button class="hans-asq-btn primary" id="hansAsqSend" type="button">Send</button></div>'
    + '</div>';
  document.body.appendChild(overlay);

  function openModal(){
    overlay.classList.add("open");
    setTimeout(function(){ document.getElementById("hansAsqName").focus(); }, 60);
  }
  function closeModal(){
    overlay.classList.remove("open");
    document.getElementById("hansAsqError").style.display = "none";
    // Reset success state if it was shown
    var modal = document.getElementById("hansAsqModal");
    if(modal && modal.dataset.success === "1"){
      modal.dataset.success = "";
      modal.innerHTML = ''
        + '<h2 class="hans-asq-title">Ask us anything</h2>'
        + '<p class="hans-asq-sub">Stan & Hannah will see this in their inbox and reply by email. Promise it goes to humans, not robots.</p>'
        + '<div class="hans-asq-field"><label class="hans-asq-label" for="hansAsqName">Your name</label><input id="hansAsqName" class="hans-asq-input" type="text" autocomplete="name" maxlength="100"></div>'
        + '<div class="hans-asq-field"><label class="hans-asq-label" for="hansAsqEmail">Your email</label><input id="hansAsqEmail" class="hans-asq-input" type="email" autocomplete="email" maxlength="200"></div>'
        + '<div class="hans-asq-field"><label class="hans-asq-label" for="hansAsqMessage">Your question</label><textarea id="hansAsqMessage" class="hans-asq-textarea" maxlength="4000"></textarea></div>'
        + '<div class="hans-asq-error" id="hansAsqError" style="display:none"></div>'
        + '<div class="hans-asq-actions"><button class="hans-asq-btn" id="hansAsqCancel" type="button">Cancel</button><button class="hans-asq-btn primary" id="hansAsqSend" type="button">Send</button></div>';
      wireModal();
    }
  }

  function showError(msg){
    var e = document.getElementById("hansAsqError");
    if(!e) return;
    e.textContent = msg;
    e.style.display = "block";
  }

  async function handleSend(){
    var name = (document.getElementById("hansAsqName").value || "").trim();
    var email = (document.getElementById("hansAsqEmail").value || "").trim();
    var message = (document.getElementById("hansAsqMessage").value || "").trim();
    if(!name){ showError("Please enter your name."); return; }
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showError("Please enter a valid email."); return; }
    if(!message || message.length < 5){ showError("Please write a question (at least 5 characters)."); return; }

    var sendBtn = document.getElementById("hansAsqSend");
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending…";

    try {
      var res = await fetch("/.netlify/functions/public-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, message: message, pageId: pageId })
      });
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok){
        showError(data.error === "valid_email_required" ? "That email doesn't look right." : (data.error === "message_too_short" ? "Please write a longer question." : ("Something went wrong: " + (data.error || res.status))));
        sendBtn.disabled = false;
        sendBtn.textContent = "Send";
        return;
      }
      // Success
      var modal = document.getElementById("hansAsqModal");
      modal.dataset.success = "1";
      modal.innerHTML = ''
        + '<div class="hans-asq-success">'
        + '<div class="hans-asq-success-icon">✓</div>'
        + '<h2 class="hans-asq-success-title">Sent.</h2>'
        + '<p class="hans-asq-success-sub">Stan and Hannah will see your question and reply to ' + email.replace(/[<>&"]/g, "") + ' soon.</p>'
        + '</div>'
        + '<div class="hans-asq-actions" style="justify-content:center;margin-top:16px"><button class="hans-asq-btn primary" id="hansAsqDone" type="button">Close</button></div>';
      document.getElementById("hansAsqDone").onclick = closeModal;
    } catch (err) {
      showError("Couldn't reach the server. Try again in a moment.");
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
  }

  function wireModal(){
    var cancel = document.getElementById("hansAsqCancel");
    var send = document.getElementById("hansAsqSend");
    if(cancel) cancel.onclick = closeModal;
    if(send) send.onclick = handleSend;
  }

  btn.onclick = openModal;
  overlay.addEventListener("click", function(e){ if(e.target === overlay) closeModal(); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && overlay.classList.contains("open")) closeModal(); });
  wireModal();
})();
