import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { createUniqueJoinCode, db } from "./db.js";
import { authRequired, roleRequired } from "./middleware/auth.js";
import { getPublicVapidKey, sendPushNotification } from "./utils/push.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: false,
  }),
);
app.use(express.json());

function createToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "7d" });
}

function getClassForTeacher(classId, teacherId) {
  return db
    .prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?")
    .get(classId, teacherId);
}

function getMembership(classId, userId) {
  return db
    .prepare("SELECT * FROM class_members WHERE class_id = ? AND user_id = ?")
    .get(classId, userId);
}

function getClassDetail(classId) {
  const classItem = db.prepare("SELECT * FROM classes WHERE id = ?").get(classId);
  if (!classItem) {
    return null;
  }

  const groups = db
    .prepare("SELECT * FROM groups WHERE class_id = ? ORDER BY created_at ASC")
    .all(classId);

  const students = db
    .prepare(
      `SELECT u.id, u.name, u.email, cm.group_id, g.name AS group_name, cm.joined_at
       FROM class_members cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN groups g ON g.id = cm.group_id
       WHERE cm.class_id = ?
       ORDER BY u.name ASC`,
    )
    .all(classId);

  const notices = db
    .prepare(
      `SELECT n.*, u.name AS author_name
       FROM notices n
       JOIN users u ON u.id = n.created_by
       WHERE n.class_id = ?
       ORDER BY n.created_at DESC`,
    )
    .all(classId);

  return {
    class: classItem,
    groups,
    students,
    notices,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !["teacher", "student"].includes(role)) {
    return res.status(400).json({ message: "필수값이 올바르지 않습니다." });
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) {
    return res.status(409).json({ message: "이미 사용 중인 이메일입니다." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    )
    .run(name, email, passwordHash, role);

  const token = createToken(result.lastInsertRowid);
  const user = db
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?")
    .get(result.lastInsertRowid);

  return res.status(201).json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user) {
    return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }

  const token = createToken(user.id);
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  });
});

app.get("/api/me", authRequired, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/bootstrap", authRequired, (req, res) => {
  if (req.user.role === "teacher") {
    const classes = db
      .prepare(
        `SELECT c.*,
          COUNT(DISTINCT cm.user_id) AS student_count,
          COUNT(DISTINCT g.id) AS group_count
         FROM classes c
         LEFT JOIN class_members cm ON cm.class_id = c.id
         LEFT JOIN groups g ON g.class_id = c.id
         WHERE c.teacher_id = ?
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
      )
      .all(req.user.id);

    const selectedClass = classes[0] ? getClassDetail(classes[0].id) : null;
    return res.json({ user: req.user, classes, selectedClass, notices: [] });
  }

  const classes = db
    .prepare(
      `SELECT c.*,
        cm.group_id,
        g.name AS group_name
       FROM class_members cm
       JOIN classes c ON c.id = cm.class_id
       LEFT JOIN groups g ON g.id = cm.group_id
       WHERE cm.user_id = ?
       ORDER BY c.created_at DESC`,
    )
    .all(req.user.id);

  const notices = db
    .prepare(
      `SELECT n.*, c.name AS class_name, u.name AS author_name
       FROM notices n
       JOIN classes c ON c.id = n.class_id
       JOIN class_members cm ON cm.class_id = c.id
       JOIN users u ON u.id = n.created_by
       WHERE cm.user_id = ?
       ORDER BY n.created_at DESC`,
    )
    .all(req.user.id);

  return res.json({ user: req.user, classes, selectedClass: null, notices });
});

app.get("/api/classes", authRequired, (req, res) => {
  if (req.user.role === "teacher") {
    const classes = db
      .prepare(
        `SELECT c.*,
          COUNT(DISTINCT cm.user_id) AS student_count,
          COUNT(DISTINCT g.id) AS group_count
         FROM classes c
         LEFT JOIN class_members cm ON cm.class_id = c.id
         LEFT JOIN groups g ON g.class_id = c.id
         WHERE c.teacher_id = ?
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
      )
      .all(req.user.id);

    return res.json({ classes });
  }

  const classes = db
    .prepare(
      `SELECT c.*,
        cm.group_id,
        g.name AS group_name
       FROM class_members cm
       JOIN classes c ON c.id = cm.class_id
       LEFT JOIN groups g ON g.id = cm.group_id
       WHERE cm.user_id = ?
       ORDER BY c.created_at DESC`,
    )
    .all(req.user.id);

  return res.json({ classes });
});

app.post("/api/classes", authRequired, roleRequired("teacher"), (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "반 이름을 입력해주세요." });
  }

  const joinCode = createUniqueJoinCode();
  const result = db
    .prepare(
      "INSERT INTO classes (name, description, join_code, teacher_id) VALUES (?, ?, ?, ?)",
    )
    .run(name, description || "", joinCode, req.user.id);

  const created = db.prepare("SELECT * FROM classes WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json({ class: created });
});

app.post("/api/classes/join", authRequired, roleRequired("student"), (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode) {
    return res.status(400).json({ message: "참여 코드를 입력해주세요." });
  }

  const classItem = db.prepare("SELECT * FROM classes WHERE join_code = ?").get(joinCode.trim().toUpperCase());
  if (!classItem) {
    return res.status(404).json({ message: "참여 코드를 찾을 수 없습니다." });
  }

  const exists = getMembership(classItem.id, req.user.id);
  if (exists) {
    return res.status(409).json({ message: "이미 참여한 반입니다." });
  }

  db.prepare("INSERT INTO class_members (class_id, user_id) VALUES (?, ?)").run(classItem.id, req.user.id);
  return res.status(201).json({ message: "반에 참여했습니다." });
});

app.get("/api/classes/:classId", authRequired, (req, res) => {
  const classId = Number(req.params.classId);
  const classItem = db.prepare("SELECT * FROM classes WHERE id = ?").get(classId);

  if (!classItem) {
    return res.status(404).json({ message: "반을 찾을 수 없습니다." });
  }

  if (req.user.role === "teacher") {
    if (classItem.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }
  } else if (!getMembership(classId, req.user.id)) {
    return res.status(403).json({ message: "접근 권한이 없습니다." });
  }

  return res.json(getClassDetail(classId));
});

app.post("/api/classes/:classId/groups", authRequired, roleRequired("teacher"), (req, res) => {
  const classId = Number(req.params.classId);
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "조 이름을 입력해주세요." });
  }

  const classItem = getClassForTeacher(classId, req.user.id);
  if (!classItem) {
    return res.status(404).json({ message: "반을 찾을 수 없거나 권한이 없습니다." });
  }

  const result = db
    .prepare("INSERT INTO groups (class_id, name) VALUES (?, ?)")
    .run(classId, name);

  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json({ group });
});

app.post("/api/classes/:classId/assign", authRequired, roleRequired("teacher"), (req, res) => {
  const classId = Number(req.params.classId);
  const { studentId, groupId } = req.body;

  const classItem = getClassForTeacher(classId, req.user.id);
  if (!classItem) {
    return res.status(404).json({ message: "반을 찾을 수 없거나 권한이 없습니다." });
  }

  const membership = getMembership(classId, studentId);
  if (!membership) {
    return res.status(404).json({ message: "해당 학생은 이 반에 참여하지 않았습니다." });
  }

  if (groupId) {
    const group = db
      .prepare("SELECT * FROM groups WHERE id = ? AND class_id = ?")
      .get(groupId, classId);
    if (!group) {
      return res.status(404).json({ message: "조를 찾을 수 없습니다." });
    }
  }

  db.prepare("UPDATE class_members SET group_id = ? WHERE class_id = ? AND user_id = ?").run(groupId || null, classId, studentId);
  return res.json({ message: "학생 배정이 완료되었습니다." });
});

app.get("/api/classes/:classId/notices", authRequired, (req, res) => {
  const classId = Number(req.params.classId);
  const classItem = db.prepare("SELECT * FROM classes WHERE id = ?").get(classId);

  if (!classItem) {
    return res.status(404).json({ message: "반을 찾을 수 없습니다." });
  }

  if (req.user.role === "teacher") {
    if (classItem.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }
  } else if (!getMembership(classId, req.user.id)) {
    return res.status(403).json({ message: "접근 권한이 없습니다." });
  }

  const notices = db
    .prepare(
      `SELECT n.*, u.name AS author_name
       FROM notices n
       JOIN users u ON u.id = n.created_by
       WHERE n.class_id = ?
       ORDER BY n.created_at DESC`,
    )
    .all(classId);

  return res.json({ notices });
});

app.post("/api/classes/:classId/notices", authRequired, roleRequired("teacher"), async (req, res) => {
  const classId = Number(req.params.classId);
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "제목과 내용을 입력해주세요." });
  }

  const classItem = getClassForTeacher(classId, req.user.id);
  if (!classItem) {
    return res.status(404).json({ message: "반을 찾을 수 없거나 권한이 없습니다." });
  }

  const result = db
    .prepare("INSERT INTO notices (class_id, title, content, created_by) VALUES (?, ?, ?, ?)")
    .run(classId, title, content, req.user.id);

  const notice = db
    .prepare(
      `SELECT n.*, u.name AS author_name
       FROM notices n
       JOIN users u ON u.id = n.created_by
       WHERE n.id = ?`,
    )
    .get(result.lastInsertRowid);

  const subscriptions = db
    .prepare(
      `SELECT ps.id, ps.subscription_json
       FROM push_subscriptions ps
       JOIN class_members cm ON cm.user_id = ps.user_id
       WHERE cm.class_id = ?`,
    )
    .all(classId);

  await Promise.all(
    subscriptions.map(async ({ id, subscription_json: subscriptionJson }) => {
      try {
        await sendPushNotification(JSON.parse(subscriptionJson), {
          title: `[${classItem.name}] ${title}`,
          body: content,
          url: "/",
        });
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(id);
        }
      }
    }),
  );

  return res.status(201).json({ notice });
});

app.get("/api/my/notices", authRequired, roleRequired("student"), (req, res) => {
  const notices = db
    .prepare(
      `SELECT n.*, c.name AS class_name, u.name AS author_name
       FROM notices n
       JOIN classes c ON c.id = n.class_id
       JOIN class_members cm ON cm.class_id = c.id
       JOIN users u ON u.id = n.created_by
       WHERE cm.user_id = ?
       ORDER BY n.created_at DESC`,
    )
    .all(req.user.id);

  return res.json({ notices });
});

app.get("/api/push/public-key", authRequired, (_req, res) => {
  res.json({ publicKey: getPublicVapidKey() });
});

app.post("/api/push/subscribe", authRequired, roleRequired("student"), (req, res) => {
  const { subscription } = req.body;

  if (!subscription?.endpoint) {
    return res.status(400).json({ message: "유효한 구독 정보가 아닙니다." });
  }

  db.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, subscription_json)
     VALUES (?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       subscription_json = excluded.subscription_json`,
  ).run(req.user.id, subscription.endpoint, JSON.stringify(subscription));

  return res.status(201).json({ message: "푸시 알림 구독이 저장되었습니다." });
});

app.listen(config.port, config.host, () => {
  console.log(`Backend listening on http://${config.host}:${config.port}`);
});
