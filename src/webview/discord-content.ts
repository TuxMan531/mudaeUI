// JS source injected into the Discord <webview> page (main world) via executeJavaScript.
// Reads Mudae messages from the DOM and pipes them to the host over the console channel
// (console.log → the host's webview 'console-message' event). Also exposes
// window.__mudaeSend(text) to send through Discord's editor.
//
// Stored as a String.raw string so escapes (\d, \n, \/) survive verbatim. Discord's
// class names are hashed and change — every selector lives here so a Discord update is a
// one-file fix. Verify with the webview DevTools.
export const DISCORD_CONTENT_SCRIPT = String.raw`(function () {
  if (window.__mudaeInjected) return;
  window.__mudaeInjected = true;

  var TAG = 'MUDAE_MSG:';
  function emit(obj) {
    try { console.log(TAG + JSON.stringify(obj)); } catch (e) {}
  }

  var SEL = {
    scroller: '[data-list-id^="chat-messages"]',
    messageLi: 'li[id^="chat-messages-"]',
    content: '[id^="message-content-"]',
    embed: '[class*="embed-"], article[class*="embed"]',
    embedAuthor: '[class*="embedAuthorName"]',
    embedDescription: '[class*="embedDescription"]',
    embedFooter: '[class*="embedFooterText"]',
    embedImage: '[class*="imageContent"] img, [class*="embedImage"] img, [class*="imageWrapper"] img',
    embedImageSlot: '[class*="imageContent"], [class*="embedImage"], [class*="imageWrapper"], [class*="embedMedia"]',
    avatarImg: 'img[class*="avatar"]',
  };
  var MUDAE_ID = '432610292342587392';

  function lines(el) {
    if (!el) return [];
    return el.innerText.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // The character art must be a DISCORD-HOSTED media url. Mudae's raw art lives on
  // mudae.net, which is hotlink-protected → it loads inside the Discord webview (referer
  // = discord.com) but NOT from our localhost renderer. Discord proxies it for display
  // through media/cdn/images-ext.discordapp, and those proxy urls load anywhere — so we
  // deliberately ignore raw mudae.net hrefs and the emoji <img>s, and take only the
  // Discord-proxied art (which renders a tick late → handled by waitForImageThenEmit).
  function isDiscordMedia(u) {
    if (!u || !/^https?:/i.test(u)) return false;
    if (/\/avatars\/|\/emojis\/|\/role-icons\/|\/badge-icons\/|\/clan-badges\/|\/app-icons\//i.test(u)) return false;
    return /(media\.discordapp\.net|cdn\.discordapp\.com|images-ext-\d+\.discordapp\.net)\//i.test(u);
  }
  // The embed's main character art, but ONLY once Discord has actually finished loading it
  // (img.complete + naturalWidth > 0). A proxied url that's merely present in the DOM can
  // still 404 for a beat while Discord generates it — handing that to the app made art show
  // up only after a retry. Waiting for the loaded <img> guarantees a ready, fetchable url.
  function pickEmbedImage(embed) {
    var best = '';
    embed.querySelectorAll('img').forEach(function (img) {
      var src = img.currentSrc || img.getAttribute('src') || img.getAttribute('data-safe-src') || '';
      if (isDiscordMedia(src) && img.complete && img.naturalWidth > 0) best = src;
    });
    return best;
  }
  // Does this embed have an image slot at all? Roll/$im embeds render the media container
  // immediately (then lazy-load the <img> inside); text embeds ($mm/$wl lists, $tu/$k)
  // never do — so we only wait-for-image on embeds that actually have a slot.
  function embedHasImageSlot(embed) {
    return !!embed.querySelector(SEL.embedImageSlot);
  }

  function parseMessage(li) {
    var id = (li.id || '').replace('chat-messages-', '');
    var contentEl = li.querySelector(SEL.content);
    var out = { type: 'message', id: id, content: contentEl ? contentEl.innerText.trim() : '' };

    var embed = li.querySelector(SEL.embed);
    if (embed) {
      var author = embed.querySelector(SEL.embedAuthor);
      var desc = embed.querySelector(SEL.embedDescription);
      var footer = embed.querySelector(SEL.embedFooter);
      out.embed = {
        author: author ? author.innerText.trim() : '',
        description: lines(desc),
        footer: footer ? footer.innerText.trim() : '',
        image: pickEmbedImage(embed),
      };
    }

    var avatar = li.querySelector(SEL.avatarImg);
    if (!avatar) {
      // Discord drops the avatar on grouped consecutive messages from one author, so a
      // $tu/$k/claim reply stacked under a previous Mudae message has no avatar of its
      // own. Inherit the author from the nearest preceding message that does have one.
      var prev = li.previousElementSibling;
      var hops = 0;
      while (prev && hops < 50) {
        if (prev.matches && prev.matches(SEL.messageLi)) {
          var pa = prev.querySelector(SEL.avatarImg);
          if (pa) { avatar = pa; break; }
        }
        prev = prev.previousElementSibling;
        hops++;
      }
    }
    if (avatar) {
      var am = (avatar.src || '').match(/avatars\/(\d+)\//);
      out.authorId = am ? am[1] : null;
      out.isMudae = out.authorId === MUDAE_ID;
    }

    var reactions = [];
    li.querySelectorAll('[class*="reaction"] [aria-label]').forEach(function (r) {
      var a = r.getAttribute('aria-label');
      if (a) reactions.push(a);
    });
    if (reactions.length) out.reactions = reactions;
    return out;
  }

  // Emit each message at most once (guards against re-renders + the async image wait
  // double-firing → duplicate roll cards).
  var emitted = Object.create(null);
  function emitMessage(li) {
    var id = li.id || '';
    if (emitted[id]) return;
    emitted[id] = true;
    try {
      var msg = parseMessage(li);
      if (msg.embed || msg.content) emit(msg);
    } catch (e) { emit({ type: 'error', msg: String(e) }); }
  }

  // Roll/$im art lazy-loads seconds after the message appears — sometimes past any fixed
  // timeout. So we emit the message IMMEDIATELY (stats show at once) and, if its image slot
  // is still empty, keep watching the <li> for up to 15s and emit a follow-up imageUpdate
  // (keyed by message id) when the Discord-proxied art finally resolves.
  function watchForImage(li) {
    var msgId = (li.id || '').replace('chat-messages-', '');
    var start = Date.now();
    var mo = null;
    var poll = 0;
    var done = false;
    function stop() {
      done = true;
      if (mo) { try { mo.disconnect(); } catch (e) {} mo = null; }
      if (poll) { clearInterval(poll); poll = 0; }
    }
    function check() {
      if (done) return;
      var e = li.querySelector(SEL.embed);
      var img = e ? pickEmbedImage(e) : '';
      if (img) { stop(); emit({ type: 'imageUpdate', id: msgId, image: img }); }
      else if (Date.now() - start > 15000) { stop(); }
    }
    mo = new MutationObserver(check);
    try {
      mo.observe(li, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'style'] });
    } catch (e) {}
    poll = setInterval(check, 300);
  }

  function handleNode(node) {
    if (!node || node.nodeType !== 1) return;
    var lis = node.matches && node.matches(SEL.messageLi)
      ? [node]
      : (node.querySelectorAll ? node.querySelectorAll(SEL.messageLi) : []);
    lis.forEach(function (li) {
      try {
        emitMessage(li); // emit now — stats/cards appear immediately
        var embed = li.querySelector(SEL.embed);
        if (embed && embedHasImageSlot(embed) && !pickEmbedImage(embed)) {
          watchForImage(li); // art still loading → send an imageUpdate when it lands
        }
      } catch (e) { emit({ type: 'error', msg: String(e) }); }
    });
  }

  var observer = null;
  var currentScroller = null;
  function attach() {
    var scroller = document.querySelector(SEL.scroller);
    if (!scroller || scroller === currentScroller) return;
    currentScroller = scroller;
    if (observer) observer.disconnect();
    observer = new MutationObserver(function (muts) {
      muts.forEach(function (mu) { mu.addedNodes.forEach(handleNode); });
    });
    observer.observe(scroller, { childList: true, subtree: true });
    emit({ type: 'status', msg: 'observer attached' });
  }
  attach();
  setInterval(attach, 2000);
  emit({ type: 'status', msg: 'content script injected' });

  window.__mudaeSend = function (text) {
    try {
      var box = document.querySelector('div[role="textbox"][data-slate-editor="true"]');
      if (!box) return 'no-input';
      box.focus();
      var dt = new DataTransfer();
      dt.setData('text/plain', text);
      box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      setTimeout(function () {
        box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      }, 60);
      return 'sent';
    } catch (e) { return 'error:' + e; }
  };
})();`;
