const API_BASE = "/api";
const app = document.getElementById("app");
const messageBox = document.getElementById("message");
const userBox = document.getElementById("userBox");
const userLabel = document.getElementById("userLabel");
const logoutButton = document.getElementById("logoutButton");

const state = {
  mode: "login",
  token: localStorage.getItem("trip-token") || "",
  user: null,
  classes: [],
  selectedClass: null,
  notices: [],
};

function setMessage(text, isError = false) {
  if (!text) {
    messageBox.classList.add("hidden");
    messageBox.textContent = "";
    messageBox.classList.remove("error");
    return;
  }

  messageBox.textContent = text;
  messageBox.classList.remove("hidden");
  messageBox.classList.toggle("error", isError);
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "요청 처리에 실패했습니다.");
  }

  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  return new Date(value).toLocaleString("ko-KR");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function uint8ArrayEquals(left, right) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
}

function renderNoticeList(notices) {
  if (!notices.length) {
    return `<p class="muted">등록된 공지가 없습니다.</p>`;
  }

  return notices
    .map(
      (notice) => `
        <article class="notice">
          <div class="notice-head">
            <strong>${escapeHtml(notice.title)}</strong>
            <span>${escapeHtml(formatDate(notice.created_at))}</span>
          </div>
          ${notice.class_name ? `<p class="tag inline">${escapeHtml(notice.class_name)}</p>` : ""}
          <p>${escapeHtml(notice.content)}</p>
          <small>작성자: ${escapeHtml(notice.author_name)}</small>
        </article>
      `,
    )
    .join("");
}

function renderAuth() {
  app.innerHTML = `
    <section class="auth-layout">
      <section class="intro panel">
        <p class="eyebrow">Trip Control Center</p>
        <h2>수학여행 공지를 반과 조 단위로 빠르게 전달하세요</h2>
        <p>
          선생님은 반을 만들고 조를 편성하며 공지를 올릴 수 있고,
          학생은 참여 코드로 반에 들어와 푸시 알림으로 즉시 소식을 받을 수 있습니다.
        </p>
        <div class="toggle">
          <button class="${state.mode === "login" ? "active" : ""}" data-mode="login" type="button">로그인</button>
          <button class="${state.mode === "register" ? "active" : ""}" data-mode="register" type="button">회원가입</button>
        </div>
      </section>
      <form class="panel form" id="authForm">
        <h2>${state.mode === "login" ? "로그인" : "회원가입"}</h2>
        ${
          state.mode === "register"
            ? `
              <label>
                이름
                <input name="name" placeholder="홍길동" />
              </label>
              <label>
                역할
                <select name="role">
                  <option value="student">학생</option>
                  <option value="teacher">선생님</option>
                </select>
              </label>
            `
            : ""
        }
        <label>
          이메일
          <input name="email" type="email" placeholder="email@example.com" />
        </label>
        <label>
          비밀번호
          <input name="password" type="password" placeholder="비밀번호" />
        </label>
        <button type="submit">${state.mode === "login" ? "로그인" : "회원가입"}</button>
      </form>
    </section>
  `;

  app.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      render();
    });
  });

  document.getElementById("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload =
      state.mode === "login"
        ? {
            email: formData.get("email"),
            password: formData.get("password"),
          }
        : {
            name: formData.get("name"),
            role: formData.get("role"),
            email: formData.get("email"),
            password: formData.get("password"),
          };

    try {
      const data = await apiFetch(`/auth/${state.mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem("trip-token", state.token);
      setMessage(state.mode === "login" ? "로그인되었습니다." : "회원가입이 완료되었습니다.");
      await refreshData();
      render();
    } catch (error) {
      setMessage(error.message, true);
    }
  });
}

function renderTeacher() {
  const selected = state.selectedClass;
  app.innerHTML = `
    <section class="dashboard">
      <div class="column">
        <form class="panel form" id="createClassForm">
          <h3>반 개설</h3>
          <label>
            반 이름
            <input name="name" placeholder="3학년 2반" />
          </label>
          <label>
            설명
            <textarea name="description" placeholder="집합 장소, 일정 등"></textarea>
          </label>
          <button type="submit">반 만들기</button>
        </form>

        <div class="panel">
          <h3>내 반 목록</h3>
          <div class="stack">
            ${
              state.classes.length
                ? state.classes
                    .map(
                      (classItem) => `
                        <button
                          class="class-card ${selected?.class.id === classItem.id ? "active" : ""}"
                          data-class-id="${classItem.id}"
                          type="button"
                        >
                          <strong>${escapeHtml(classItem.name)}</strong>
                          <span>참여 코드: ${escapeHtml(classItem.join_code)}</span>
                          <span>학생 ${classItem.student_count || 0}명 / 조 ${classItem.group_count || 0}개</span>
                        </button>
                      `,
                    )
                    .join("")
                : `<p class="muted">아직 개설한 반이 없습니다.</p>`
            }
          </div>
        </div>
      </div>

      <div class="column wide">
        ${
          !selected
            ? `
              <div class="panel hero">
                <h3>반을 선택해주세요</h3>
                <p>반을 만들거나 왼쪽 목록에서 선택하면 조 편성, 학생 배정, 공지 작성이 가능합니다.</p>
              </div>
            `
            : `
              <div class="panel">
                <h3>${escapeHtml(selected.class.name)}</h3>
                <p>${escapeHtml(selected.class.description || "설명이 없습니다.")}</p>
                <p class="tag">참여 코드: ${escapeHtml(selected.class.join_code)}</p>
              </div>

              <form class="panel form" id="groupForm">
                <h3>조 개설</h3>
                <label>
                  조 이름
                  <input name="name" placeholder="1조" />
                </label>
                <button type="submit">조 추가</button>
              </form>

              <div class="panel">
                <h3>학생 배정</h3>
                <div class="stack">
                  ${
                    selected.students.length
                      ? selected.students
                          .map(
                            (student) => `
                              <div class="student-row">
                                <div>
                                  <strong>${escapeHtml(student.name)}</strong>
                                  <p>${escapeHtml(student.email)}</p>
                                </div>
                                <select data-student-id="${student.id}" class="group-select">
                                  <option value="">조 미배정</option>
                                  ${selected.groups
                                    .map(
                                      (group) => `
                                        <option value="${group.id}" ${student.group_id === group.id ? "selected" : ""}>
                                          ${escapeHtml(group.name)}
                                        </option>
                                      `,
                                    )
                                    .join("")}
                                </select>
                              </div>
                            `,
                          )
                          .join("")
                      : `<p class="muted">참여한 학생이 아직 없습니다.</p>`
                  }
                </div>
              </div>

              <form class="panel form" id="noticeForm">
                <h3>공지 작성</h3>
                <label>
                  제목
                  <input name="title" placeholder="집합 시간 변경" />
                </label>
                <label>
                  내용
                  <textarea name="content" placeholder="오전 8시까지 버스 앞 집합"></textarea>
                </label>
                <button type="submit">공지 발송</button>
              </form>

              <div class="panel">
                <h3>공지</h3>
                <div class="stack">${renderNoticeList(selected.notices)}</div>
              </div>
            `
        }
      </div>
    </section>
  `;

  document.getElementById("createClassForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    try {
      await apiFetch("/classes", {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
        }),
      });
      setMessage("반을 개설했습니다.");
      await refreshData();
      render();
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  app.querySelectorAll("[data-class-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openClass(Number(button.dataset.classId));
      render();
    });
  });

  if (!selected) {
    return;
  }

  document.getElementById("groupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    try {
      await apiFetch(`/classes/${selected.class.id}/groups`, {
        method: "POST",
        body: JSON.stringify({ name: formData.get("name") }),
      });
      setMessage("조를 추가했습니다.");
      await openClass(selected.class.id);
      render();
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  app.querySelectorAll(".group-select").forEach((select) => {
    select.addEventListener("change", async () => {
      try {
        await apiFetch(`/classes/${selected.class.id}/assign`, {
          method: "POST",
          body: JSON.stringify({
            studentId: Number(select.dataset.studentId),
            groupId: select.value ? Number(select.value) : null,
          }),
        });
        setMessage("학생 배정을 저장했습니다.");
        await openClass(selected.class.id);
        render();
      } catch (error) {
        setMessage(error.message, true);
      }
    });
  });

  document.getElementById("noticeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    try {
      await apiFetch(`/classes/${selected.class.id}/notices`, {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          content: formData.get("content"),
        }),
      });
      setMessage("공지와 푸시 알림을 발송했습니다.");
      await openClass(selected.class.id);
      render();
    } catch (error) {
      setMessage(error.message, true);
    }
  });
}

function renderStudent() {
  app.innerHTML = `
    <section class="dashboard">
      <div class="column">
        <form class="panel form" id="joinForm">
          <h3>반 참여</h3>
          <label>
            참여 코드
            <input name="joinCode" placeholder="ABC123" />
          </label>
          <button type="submit">참여하기</button>
        </form>

        <div class="panel">
          <h3>푸시 알림</h3>
          <p>브라우저에서 이 버튼을 누르면 새 공지를 알림으로 받을 수 있습니다.</p>
          <button id="pushButton" type="button">푸시 알림 켜기</button>
        </div>

        <div class="panel">
          <h3>참여한 반</h3>
          <div class="stack">
            ${
              state.classes.length
                ? state.classes
                    .map(
                      (classItem) => `
                        <div class="class-card static">
                          <strong>${escapeHtml(classItem.name)}</strong>
                          <span>${escapeHtml(classItem.group_name ? `소속 조: ${classItem.group_name}` : "조 미배정")}</span>
                          <span>참여 코드: ${escapeHtml(classItem.join_code)}</span>
                        </div>
                      `,
                    )
                    .join("")
                : `<p class="muted">아직 참여한 반이 없습니다.</p>`
            }
          </div>
        </div>
      </div>

      <div class="column wide">
        <div class="panel">
          <h3>공지</h3>
          <div class="stack">${renderNoticeList(state.notices)}</div>
        </div>
      </div>
    </section>
  `;

  document.getElementById("joinForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    try {
      await apiFetch("/classes/join", {
        method: "POST",
        body: JSON.stringify({
          joinCode: String(formData.get("joinCode")).toUpperCase(),
        }),
      });
      setMessage("반 참여가 완료되었습니다.");
      await refreshData();
      render();
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  document.getElementById("pushButton").addEventListener("click", async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const keyResponse = await apiFetch("/push/public-key");
      const applicationServerKey = urlBase64ToUint8Array(keyResponse.publicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (
        subscription &&
        !uint8ArrayEquals(subscription.options.applicationServerKey, applicationServerKey)
      ) {
        await subscription.unsubscribe();
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      await apiFetch("/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription }),
      });

      setMessage("푸시 알림 수신이 등록되었습니다.");
    } catch (error) {
      setMessage(error.message, true);
    }
  });
}

function render() {
  if (state.user) {
    userBox.classList.remove("hidden");
    userLabel.textContent = `${state.user.name} · ${state.user.role === "teacher" ? "선생님" : "학생"}`;
  } else {
    userBox.classList.add("hidden");
    userLabel.textContent = "";
  }

  if (!state.user) {
    renderAuth();
    return;
  }

  if (state.user.role === "teacher") {
    renderTeacher();
  } else {
    renderStudent();
  }
}

async function openClass(classId) {
  state.selectedClass = await apiFetch(`/classes/${classId}`);
}

async function refreshData() {
  const data = await apiFetch("/bootstrap");
  state.user = data.user;
  state.classes = data.classes;
  state.notices = data.notices;

  if (state.user.role === "teacher") {
    const currentClassId = state.selectedClass?.class.id;
    if (currentClassId && data.classes.some((classItem) => classItem.id === currentClassId)) {
      await openClass(currentClassId);
    } else {
      state.selectedClass = data.selectedClass;
    }
    return;
  }

  state.selectedClass = null;
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("trip-token");
  state.token = "";
  state.user = null;
  state.classes = [];
  state.selectedClass = null;
  state.notices = [];
  setMessage("로그아웃되었습니다.");
  render();
});

async function bootstrap() {
  if (state.token) {
    try {
      await refreshData();
    } catch {
      localStorage.removeItem("trip-token");
      state.token = "";
      state.user = null;
    }
  }

  render();
}

bootstrap();
