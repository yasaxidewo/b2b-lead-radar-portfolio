const elements = {
  sourcePath: document.querySelector("#source-path"),
  sourceFile: document.querySelector("#source-file"),
  sourceMeta: document.querySelector("#source-meta"),
  runState: document.querySelector("#run-state"),
  taskBody: document.querySelector("#task-body"),
  logList: document.querySelector("#log-list"),
  selectAll: document.querySelector("#select-all"),
  approvalCheck: document.querySelector("#approval-check"),
  batchLimit: document.querySelector("#batch-limit"),
  sortMode: document.querySelector("#sort-mode"),
  sortButton: document.querySelector("#sort-button"),
  browserStatus: document.querySelector("#browser-status"),
  browserEndpoint: document.querySelector("#browser-endpoint"),
  browserNotice: document.querySelector("#browser-notice"),
  startBrowserButton: document.querySelector("#start-browser-button"),
  selectFileButton: document.querySelector("#select-file-button"),
  importButton: document.querySelector("#import-button"),
  selectFiveButton: document.querySelector("#select-five-button"),
  selectTenButton: document.querySelector("#select-ten-button"),
  refreshStatusButton: document.querySelector("#refresh-status-button"),
  simulateButton: document.querySelector("#simulate-button"),
  approveButton: document.querySelector("#approve-button"),
  executeButton: document.querySelector("#execute-button"),
  toast: document.querySelector("#toast"),
};

let currentState = null;
let toastTimer = null;
let browserConnected = false;
let browserStarting = false;
let sourcePathDirty = false;
let selectedSourceFile = null;
let sortModeDirty = false;

const statusLabels = {
  pending_review: "待审核",
  approved: "已批准",
  preparing: "定位与点赞中",
  prepared: "草稿已核对",
  publishing: "发布中",
  verifying: "页面核验中",
  published_verified: "已完成",
  risk_stop: "风险停止",
  verification_blocked: "认证阻断",
  verification_pending: "待核验",
  not_published: "未完成",
  error: "执行异常",
};

function showToast(message, type = "info") {
  elements.toast.textContent = message;
  elements.toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.className = "toast";
  }, 3600);
}

function renderBrowserStatus(status) {
  browserConnected = Boolean(status.connected);
  browserStarting = Boolean(status.starting);
  elements.browserEndpoint.textContent =
    status.cdpUrl || "http://127.0.0.1:9223";
  elements.browserStatus.textContent = browserConnected
    ? "已连接"
    : browserStarting
      ? "启动中"
      : "未连接";
  elements.browserStatus.className = `tag ${
    browserConnected
      ? "browser-online"
      : browserStarting
        ? "running"
        : "browser-offline"
  }`;
  elements.startBrowserButton.textContent = browserConnected
    ? "专用 Chrome 已运行"
    : browserStarting
      ? "正在启动…"
      : "运行专用 Chrome";
  elements.startBrowserButton.disabled =
    browserConnected || browserStarting || Boolean(currentState?.running);
  elements.browserNotice.textContent = browserConnected
    ? "连接正常。请保持专用 Chrome 打开，完成登录或短信认证后再执行评论。"
    : "尚未连接专用 Chrome。请先运行浏览器，登录抖音后再继续执行。";
  if (currentState) {
    elements.executeButton.disabled =
      currentState.running || !browserConnected;
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "操作失败");
  }
  return data;
}

async function uploadWorkbook(file) {
  const response = await fetch("/api/import-upload", {
    method: "POST",
    headers: {
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "文件导入失败");
  }
  return data;
}

function selectedIds() {
  return [...document.querySelectorAll("input[data-task-select]:checked")].map(
    (input) => input.dataset.taskSelect,
  );
}

function makeText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function statusBadge(task) {
  const badge = makeText(
    "span",
    `status status-${task.status}`,
    statusLabels[task.status] || task.status,
  );
  return badge;
}

function renderTask(task, index) {
  const row = document.createElement("tr");
  if (task.published) row.classList.add("is-complete");

  const selectCell = document.createElement("td");
  selectCell.className = "select-cell";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.taskSelect = task.id;
  checkbox.checked = Boolean(task.selected);
  checkbox.disabled = task.published || currentState.running;
  checkbox.addEventListener("change", async () => {
    try {
      await api("/api/update", {
        method: "POST",
        body: JSON.stringify({ id: task.id, selected: checkbox.checked }),
      });
      await refresh();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  selectCell.append(checkbox);

  const personCell = document.createElement("td");
  const badges = document.createElement("div");
  badges.className = "order-badges";
  badges.append(
    makeText("span", "touch-order", `触达 ${index + 1}`),
    makeText("span", "priority", task.priority),
  );
  personCell.append(
    badges,
    makeText("strong", "nickname", task.nickname || "昵称缺失"),
    makeText(
      "small",
      "meta",
      [
        task.pageTime || (task.capturedAt ? `抓取 ${task.capturedAt}` : ""),
        `源表第 ${task.sourceRow} 行`,
      ]
        .filter(Boolean)
        .join(" · "),
    ),
  );

  const commentCell = document.createElement("td");
  commentCell.append(
    makeText("p", "comment", task.commentText || "评论原文缺失"),
    makeText("span", "need", task.needCategory),
  );

  const replyCell = document.createElement("td");
  const textarea = document.createElement("textarea");
  textarea.value = task.replyText;
  textarea.placeholder = "填写结合用户原话的公开回复";
  textarea.disabled = task.published || currentState.running;
  textarea.addEventListener("change", async () => {
    try {
      await api("/api/update", {
        method: "POST",
        body: JSON.stringify({ id: task.id, replyText: textarea.value }),
      });
      showToast("话术已保存，该条需要重新审批。", "success");
      await refresh();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  replyCell.append(textarea);

  const completeCell = document.createElement("td");
  if (task.executable || task.published) {
    completeCell.append(makeText("span", "complete yes", "字段完整"));
  } else {
    completeCell.append(
      makeText("span", "complete no", `缺 ${task.missing.length} 项`),
      makeText("small", "missing", task.missing.join("、")),
    );
  }

  const statusCell = document.createElement("td");
  statusCell.append(statusBadge(task));
  if (task.approved && !task.published) {
    statusCell.append(makeText("small", "approved-note", "已人工批准"));
  }
  if (task.lastError) {
    statusCell.append(makeText("small", "error-note", task.lastError));
  }

  row.append(
    selectCell,
    personCell,
    commentCell,
    replyCell,
    completeCell,
    statusCell,
  );
  return row;
}

function renderLogs(logs) {
  elements.logList.replaceChildren();
  if (logs.length === 0) {
    elements.logList.append(
      makeText("div", "empty-log", "还没有执行记录。"),
    );
    return;
  }
  for (const log of logs.slice(0, 12)) {
    const item = document.createElement("div");
    item.className = `log-item log-${log.level}`;
    const time = new Date(log.timestamp).toLocaleTimeString("zh-CN", {
      hour12: false,
    });
    item.append(
      makeText("time", "", time),
      makeText("span", "", log.message),
    );
    elements.logList.append(item);
  }
}

function render(state) {
  currentState = state;
  if (!sortModeDirty) {
    elements.sortMode.value = state.sortMode || "source";
  }
  if (!sourcePathDirty) {
    elements.sourcePath.value = state.sourcePath || "";
  }
  elements.sourceMeta.textContent = state.sourcePath
    ? `${state.sourceSheet || "工作表"} · ${state.tasks.length} 条 · 去重 ${state.duplicateCount || 0} 条`
    : "等待读取本地 Excel";
  elements.runState.textContent = state.running ? "执行中" : "空闲";
  elements.runState.className = `tag ${state.running ? "running" : ""}`;

  for (const [key, value] of Object.entries(state.counts)) {
    const counter = document.querySelector(`#count-${key}`);
    if (counter) counter.textContent = value;
  }

  elements.taskBody.replaceChildren();
  for (const [index, task] of state.tasks.entries()) {
    elements.taskBody.append(renderTask(task, index));
  }
  if (state.tasks.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "empty-table";
    cell.textContent = "请先导入筛选表。";
    row.append(cell);
    elements.taskBody.append(row);
  }

  const selectableTasks = state.tasks.filter((task) => !task.published);
  const selectedTaskCount = selectableTasks.filter((task) => task.selected).length;
  elements.selectAll.checked =
    selectableTasks.length > 0 && selectedTaskCount === selectableTasks.length;
  elements.selectAll.indeterminate =
    selectedTaskCount > 0 && selectedTaskCount < selectableTasks.length;
  elements.selectAll.disabled = state.running || selectableTasks.length === 0;

  renderLogs(state.logs || []);
  elements.importButton.disabled = state.running;
  elements.selectFileButton.disabled = state.running;
  elements.startBrowserButton.disabled =
    state.running || browserConnected || browserStarting;
  elements.refreshStatusButton.disabled = state.running;
  elements.selectFiveButton.disabled = state.running || state.tasks.length === 0;
  elements.selectTenButton.disabled = state.running || state.tasks.length === 0;
  elements.approveButton.disabled = state.running;
  elements.sortButton.disabled = state.running || state.tasks.length === 0;
  elements.sortMode.disabled = state.running || state.tasks.length === 0;
  elements.executeButton.disabled = state.running || !browserConnected;
  elements.simulateButton.disabled = state.running;
}

async function refresh() {
  try {
    render(await api("/api/state"));
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function refreshBrowserStatus({ quiet = true } = {}) {
  try {
    renderBrowserStatus(await api("/api/browser/status"));
  } catch (error) {
    renderBrowserStatus({
      connected: false,
      starting: false,
      cdpUrl: "http://127.0.0.1:9223",
    });
    if (!quiet) showToast(error.message, "error");
  }
}

elements.sourcePath.addEventListener("input", () => {
  sourcePathDirty = true;
  selectedSourceFile = null;
  elements.sourceFile.value = "";
});

elements.selectFileButton.addEventListener("click", () => {
  elements.sourceFile.click();
});

elements.sourceFile.addEventListener("change", () => {
  const file = elements.sourceFile.files?.[0];
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) {
    selectedSourceFile = null;
    elements.sourceFile.value = "";
    showToast("请选择 .xlsx 文件。", "error");
    return;
  }
  selectedSourceFile = file;
  elements.sourcePath.value = `已选择：${file.name}`;
  sourcePathDirty = true;
  showToast("文件已选择，点击“读取名单”后导入。", "success");
});

elements.startBrowserButton.addEventListener("click", async () => {
  try {
    browserStarting = true;
    renderBrowserStatus({
      connected: false,
      starting: true,
      cdpUrl: "http://127.0.0.1:9223",
    });
    showToast("正在启动专用 Chrome…", "info");
    const result = await api("/api/browser/start", { method: "POST" });
    renderBrowserStatus(result);
    showToast(
      result.alreadyRunning
        ? "专用 Chrome 已经在运行。"
        : "专用 Chrome 已启动，请确认抖音登录状态。",
      "success",
    );
    await refresh();
  } catch (error) {
    await refreshBrowserStatus();
    showToast(error.message, "error");
  }
});

elements.importButton.addEventListener("click", async () => {
  try {
    const sourcePath = elements.sourcePath.value.trim();
    if (!selectedSourceFile && !sourcePath) {
      throw new Error("请选择 Excel 文件或填写文件路径");
    }
    elements.importButton.disabled = true;
    showToast("正在读取并检查字段…");
    sourcePathDirty = false;
    const importedState = selectedSourceFile
      ? await uploadWorkbook(selectedSourceFile)
      : await api("/api/import", {
          method: "POST",
          body: JSON.stringify({ path: sourcePath }),
        });
    selectedSourceFile = null;
    elements.sourceFile.value = "";
    render(importedState);
    showToast("名单已导入并完成去重。", "success");
  } catch (error) {
    sourcePathDirty = true;
    showToast(error.message, "error");
  } finally {
    elements.importButton.disabled = false;
  }
});

elements.selectAll.addEventListener("change", async () => {
  const selected = elements.selectAll.checked;
  try {
    elements.selectAll.disabled = true;
    const selectedState = await api("/api/select-all", {
      method: "POST",
      body: JSON.stringify({ selected }),
    });
    render(selectedState);
    showToast(
      selected
        ? `已一次性勾选 ${selectedState.selectedCount} 条。`
        : "已取消全部勾选。",
      "success",
    );
  } catch (error) {
    await refresh();
    showToast(error.message, "error");
  }
});

elements.sortMode.addEventListener("change", () => {
  sortModeDirty = true;
});

elements.sortButton.addEventListener("click", async () => {
  try {
    const mode = elements.sortMode.value;
    elements.sortButton.disabled = true;
    const sortedState = await api("/api/sort", {
      method: "POST",
      body: JSON.stringify({ mode }),
    });
    sortModeDirty = false;
    render(sortedState);
    const labels = {
      source: "导入顺序",
      newest: "评论时间（最新优先）",
      oldest: "评论时间（最早优先）",
    };
    const suffix = sortedState.sortSummary?.unparsed
      ? `；${sortedState.sortSummary.unparsed} 条时间无法识别，已置后`
      : "";
    showToast(`触达顺序已改为${labels[mode]}${suffix}。`, "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.sortButton.disabled =
      Boolean(currentState?.running) || !currentState?.tasks?.length;
  }
});

async function selectBatch(limit) {
  try {
    elements.selectFiveButton.disabled = true;
    elements.selectTenButton.disabled = true;
    const selectedState = await api("/api/select-batch", {
      method: "POST",
      body: JSON.stringify({ limit }),
    });
    elements.batchLimit.value = String(limit);
    elements.approvalCheck.checked = false;
    render(selectedState);
    const suffix = selectedState.selectedCount < limit
      ? `，当前只有 ${selectedState.selectedCount} 条可选`
      : "";
    showToast(`已按当前触达顺序选择前 ${selectedState.selectedCount} 条${suffix}。`, "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    const disabled = Boolean(currentState?.running) || !currentState?.tasks?.length;
    elements.selectFiveButton.disabled = disabled;
    elements.selectTenButton.disabled = disabled;
  }
}

elements.selectFiveButton.addEventListener("click", () => {
  void selectBatch(5);
});

elements.selectTenButton.addEventListener("click", () => {
  void selectBatch(10);
});

elements.approveButton.addEventListener("click", async () => {
  try {
    const ids = selectedIds();
    if (ids.length === 0) throw new Error("请先勾选本批任务");
    render(
      await api("/api/approve", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    );
    showToast("所选且字段完整的任务已批准。", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
});

elements.refreshStatusButton.addEventListener("click", async () => {
  try {
    const ids = currentState.tasks.map((task) => task.id);
    if (ids.length === 0) throw new Error("当前没有可以刷新的任务");
    await api("/api/reconcile", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    showToast(`正在只读核验全部 ${ids.length} 条…`, "info");
    await refresh();
  } catch (error) {
    showToast(error.message, "error");
  }
});

elements.simulateButton.addEventListener("click", async () => {
  try {
    const ids = selectedIds();
    if (ids.length === 0) throw new Error("请先勾选要检查的任务");
    const result = await api("/api/simulate", {
      method: "POST",
      body: JSON.stringify({
        ids,
        limit: Number(elements.batchLimit.value),
      }),
    });
    if (result.ok) {
      showToast(
        `检查通过：${result.executable} 条可执行，${result.published} 条已完成。`,
        "success",
      );
    } else {
      showToast(result.problems.slice(0, 3).join("；"), "error");
    }
  } catch (error) {
    showToast(error.message, "error");
  }
});

elements.executeButton.addEventListener("click", async () => {
  try {
    if (!browserConnected) {
      throw new Error("请先完成第 1 步，运行并连接专用 Chrome");
    }
    if (!elements.approvalCheck.checked) {
      throw new Error("请先勾选“我已人工审核本批话术”");
    }
    const ids = selectedIds();
    if (ids.length === 0) throw new Error("请先勾选本批任务");
    const approved = currentState.tasks.filter(
      (task) => ids.includes(task.id) && task.approved && !task.published,
    );
    if (approved.length === 0) throw new Error("所选任务尚未批准");
    if (
      !window.confirm(
        `将自动逐条执行 ${Math.min(
          approved.length,
          Number(elements.batchLimit.value),
        )} 条：定位、点赞、回复、核验。是否开始？`,
      )
    ) {
      return;
    }
    await api("/api/execute", {
      method: "POST",
      body: JSON.stringify({
        ids,
        limit: Number(elements.batchLimit.value),
        approvalPhrase: "我已审核本批话术",
      }),
    });
    showToast("本地 worker 已开始执行。", "success");
    await refresh();
  } catch (error) {
    showToast(error.message, "error");
  }
});

await refresh();
await refreshBrowserStatus();
setInterval(() => {
  void refresh();
  void refreshBrowserStatus();
}, 1800);
