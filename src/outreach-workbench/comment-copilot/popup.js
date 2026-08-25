const fieldIds = [
  "videoUrl",
  "commentId",
  "nickname",
  "commentText",
  "replyText"
];

const fields = Object.fromEntries(
  fieldIds.map((id) => [id, document.getElementById(id)])
);
const statusBox = document.getElementById("status");

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
}

async function saveForm() {
  const values = Object.fromEntries(
    fieldIds.map((id) => [id, fields[id].value])
  );
  await chrome.storage.local.set({ douyinCommentCopilotForm: values });
}

async function restoreForm() {
  const result = await chrome.storage.local.get("douyinCommentCopilotForm");
  const values = result.douyinCommentCopilotForm || {};
  for (const id of fieldIds) {
    fields[id].value = values[id] || "";
    fields[id].addEventListener("input", saveForm);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("没有找到当前 Chrome 标签页。");
  }
  return tab;
}

async function sendToPage(action, payload = {}) {
  await saveForm();
  const tab = await getActiveTab();
  if (!tab.url?.startsWith("https://www.douyin.com/")) {
    throw new Error("请先打开抖音视频或图文页面。");
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, { action, payload });
  } catch (error) {
    throw new Error("页面助手尚未加载，请刷新当前抖音页面后重试。");
  }
}

function targetPayload() {
  return {
    commentId: fields.commentId.value.trim(),
    nickname: fields.nickname.value.trim(),
    commentText: fields.commentText.value.trim()
  };
}

async function run(action, payload, pendingText) {
  setStatus(pendingText);
  try {
    const result = await sendToPage(action, payload);
    if (!result?.ok) {
      throw new Error(result?.message || "页面操作失败。");
    }
    setStatus(result.message || "操作完成。");
  } catch (error) {
    setStatus(error.message || String(error), true);
  }
}

document.getElementById("openVideo").addEventListener("click", async () => {
  const url = fields.videoUrl.value.trim();
  if (!/^https:\/\/www\.douyin\.com\/(video|note)\//.test(url)) {
    setStatus("请填写有效的抖音 video 或 note 链接。", true);
    return;
  }
  await saveForm();
  const tab = await getActiveTab();
  await chrome.tabs.update(tab.id, { url });
  setStatus("视频已打开；评论加载后再次打开本助手。");
});

document.getElementById("locate").addEventListener("click", () => {
  run("locate", targetPayload(), "正在定位目标评论……");
});

document.getElementById("likeAndReply").addEventListener("click", () => {
  run("likeAndReply", targetPayload(), "正在核对、点赞并打开回复框……");
});

document.getElementById("fillReply").addEventListener("click", () => {
  const replyText = fields.replyText.value.trim();
  if (!replyText) {
    setStatus("请先填写公开回复。", true);
    return;
  }
  (async () => {
    setStatus("正在复制回复并定位输入框……");
    try {
      await navigator.clipboard.writeText(replyText);
      const result = await sendToPage("prepareReply", targetPayload());
      if (!result?.ok) {
        throw new Error(result?.message || "没有找到回复输入框。");
      }
      setStatus(
        "回复已复制。请关闭助手，在绿色高亮的回复框中按 Ctrl+V；不会自动发布。"
      );
    } catch (error) {
      setStatus(error.message || String(error), true);
    }
  })();
});

restoreForm();
