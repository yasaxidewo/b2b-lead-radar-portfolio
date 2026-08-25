(() => {
  const HIGHLIGHT_ATTR = "data-polyv-comment-copilot-target";
  let currentTarget = null;
  let currentDescriptor = null;

  function normalize(value) {
    return String(value || "")
      .replace(/[\u200b-\u200d\ufeff]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function withoutEmoji(value) {
    try {
      return normalize(value).replace(/\p{Extended_Pictographic}/gu, "");
    } catch {
      return normalize(value);
    }
  }

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function itemNickname(item) {
    const profileLinks = Array.from(
      item.querySelectorAll('a[href*="/user/"]')
    );
    return profileLinks.map((link) => normalize(link.innerText)).filter(Boolean);
  }

  function descriptorMatches(item, descriptor) {
    const nickname = normalize(descriptor.nickname);
    const commentText = withoutEmoji(descriptor.commentText);
    const nicknames = itemNickname(item);
    const itemText = withoutEmoji(item.innerText);
    const nicknameMatches = !nickname || nicknames.includes(nickname);
    const commentMatches = !commentText || itemText.includes(commentText);
    return nicknameMatches && commentMatches;
  }

  function locateTarget(descriptor) {
    const commentId = String(descriptor.commentId || "").trim();
    const nickname = normalize(descriptor.nickname);
    const commentText = normalize(descriptor.commentText);

    if (!commentId && !nickname && !commentText) {
      throw new Error("至少填写评论 ID，或填写昵称/评论原文。");
    }

    let candidates = [];
    if (commentId) {
      const marker = document.getElementById(`tooltip_${commentId}`);
      const item = marker?.closest('[data-e2e="comment-item"]');
      if (item) candidates = [item];
    } else {
      candidates = Array.from(
        document.querySelectorAll('[data-e2e="comment-item"]')
      ).filter((item) => descriptorMatches(item, descriptor));
    }

    if (candidates.length === 0) {
      throw new Error(
        "当前已加载的评论中没有找到目标。请滚动加载更多评论，或补充评论 ID。"
      );
    }
    if (candidates.length > 1) {
      throw new Error(
        `找到 ${candidates.length} 条相似评论，请补充评论 ID 后再操作。`
      );
    }

    const target = candidates[0];
    if (commentId && !descriptorMatches(target, descriptor)) {
      throw new Error("评论 ID 已找到，但昵称或原文不一致，已停止操作。");
    }
    return target;
  }

  function highlight(item) {
    document
      .querySelectorAll(`[${HIGHLIGHT_ATTR}]`)
      .forEach((element) => element.removeAttribute(HIGHLIGHT_ATTR));
    item.setAttribute(HIGHLIGHT_ATTR, "true");
    item.style.outline = "3px solid #00d6b9";
    item.style.outlineOffset = "4px";
    item.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setCurrentTarget(descriptor) {
    const target = locateTarget(descriptor);
    currentTarget = target;
    currentDescriptor = { ...descriptor };
    highlight(target);
    return target;
  }

  function ensureCurrentTarget(descriptor) {
    if (
      currentTarget?.isConnected &&
      JSON.stringify(currentDescriptor) === JSON.stringify(descriptor)
    ) {
      return currentTarget;
    }
    return setCurrentTarget(descriptor);
  }

  function likeState(item) {
    const stats =
      item.querySelector(".comment-item-stats-container") ||
      item.querySelector('[class*="stats-container"]');
    const likeControl = stats?.querySelector("p");
    const heartPath = likeControl?.querySelector("svg path");
    if (!likeControl || !heartPath) {
      throw new Error("没有识别到点赞按钮，页面结构可能已变化。");
    }
    const fill =
      normalize(heartPath.getAttribute("fill")) ||
      normalize(getComputedStyle(heartPath).fill);
    const liked = /fe2c55|rgb\(\s*254,\s*44,\s*85\s*\)/i.test(fill);
    return { likeControl, liked };
  }

  function findReplyControl(item) {
    const label = Array.from(item.querySelectorAll("span, div")).find(
      (element) =>
        element.children.length === 0 &&
        normalize(element.innerText) === "回复" &&
        element.closest('[data-e2e="comment-item"]') === item
    );
    if (!(label instanceof HTMLElement)) {
      throw new Error("没有识别到回复按钮，页面结构可能已变化。");
    }
    return {
      label,
      parentControl: label.closest("[tabindex]") || label.parentElement
    };
  }

  function matchingReplyEditor(descriptor) {
    const nickname = normalize(descriptor.nickname);
    const editors = Array.from(
      document.querySelectorAll(
        '[contenteditable="true"][role="combobox"], [contenteditable="true"]'
      )
    ).filter(visible);
    return editors.find((editor) => {
      const describedBy = editor.getAttribute("aria-describedby");
      const placeholder = describedBy
        ? normalize(document.getElementById(describedBy)?.innerText)
        : "";
      return !nickname || !placeholder || placeholder.includes(nickname);
    });
  }

  async function waitForReplyEditor(descriptor, timeoutMs = 1200) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const editor = matchingReplyEditor(descriptor);
      if (editor) return editor;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  }

  async function likeAndOpenReply(item, descriptor) {
    const state = likeState(item);
    let likeMessage = "该评论已经点赞";
    if (!state.liked) {
      state.likeControl.click();
      likeMessage = "已点赞该评论";
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    const { label, parentControl } = findReplyControl(item);
    label.scrollIntoView({ behavior: "smooth", block: "center" });
    label.click();
    let editor = await waitForReplyEditor(descriptor);
    if (!editor && parentControl instanceof HTMLElement && parentControl !== label) {
      parentControl.click();
      editor = await waitForReplyEditor(descriptor);
    }
    if (!editor) {
      throw new Error("点赞已完成，但回复框没有打开；已停止后续操作。");
    }
    editor.focus();
    return likeMessage;
  }

  function editorFor(descriptor) {
    const nickname = normalize(descriptor.nickname);
    const editors = Array.from(
      document.querySelectorAll(
        '[contenteditable="true"][role="combobox"], [contenteditable="true"]'
      )
    ).filter(visible);
    if (editors.length === 0) {
      throw new Error("没有找到回复输入框，请先执行第 2 步。");
    }
    if (editors.length > 1) {
      throw new Error("页面上出现多个编辑器，无法安全判断目标回复框。");
    }
    const editor = editors[0];
    const describedBy = editor.getAttribute("aria-describedby");
    const placeholder = describedBy
      ? normalize(document.getElementById(describedBy)?.innerText)
      : "";
    if (nickname && placeholder && !placeholder.includes(nickname)) {
      throw new Error(
        `当前输入框是“${placeholder}”，不是目标用户 ${nickname}，已停止填入。`
      );
    }
    return editor;
  }

  function prepareEditor(editor) {
    editor.style.outline = "3px solid #00d6b9";
    editor.style.outlineOffset = "3px";
    editor.scrollIntoView({ behavior: "smooth", block: "center" });
    editor.focus();
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    (async () => {
      if (!location.hostname.endsWith("douyin.com")) {
        throw new Error("当前不是抖音页面。");
      }
      const descriptor = request.payload || {};
      if (request.action === "locate") {
        const target = setCurrentTarget(descriptor);
        sendResponse({
          ok: true,
          message: `已定位：${itemNickname(target)[0] || "目标评论"}。`
        });
        return;
      }
      if (request.action === "likeAndReply") {
        const target = ensureCurrentTarget(descriptor);
        const likeMessage = await likeAndOpenReply(target, descriptor);
        sendResponse({
          ok: true,
          message: `${likeMessage}，并已打开正确的回复框。`
        });
        return;
      }
      if (request.action === "prepareReply") {
        ensureCurrentTarget(descriptor);
        const editor = editorFor(descriptor);
        prepareEditor(editor);
        sendResponse({
          ok: true,
          message: "已定位回复框。回复内容已由助手复制到剪贴板。"
        });
        return;
      }
      throw new Error("未知操作。");
    })().catch((error) => {
      sendResponse({ ok: false, message: error.message || String(error) });
    });
    return true;
  });
})();
