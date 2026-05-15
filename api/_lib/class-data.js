import { generateJoinCode } from "./join-code.js";
import { getSupabaseAdmin } from "./supabase.js";

export async function createUniqueJoinCode() {
  const supabase = getSupabaseAdmin();
  let joinCode = generateJoinCode();

  while (true) {
    const existing = await supabase
      .from("classes")
      .select("id")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (!existing.data) {
      return joinCode;
    }

    joinCode = generateJoinCode();
  }
}

export async function getMembership(classId, userId) {
  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("class_members")
    .select("*")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();

  return result.data || null;
}

export async function getClassForTeacher(classId, teacherId) {
  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  return result.data || null;
}

export async function getTeacherClasses(teacherId) {
  const supabase = getSupabaseAdmin();
  const classResult = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (classResult.error) {
    throw classResult.error;
  }

  const classes = classResult.data || [];
  if (!classes.length) {
    return [];
  }

  const classIds = classes.map((item) => item.id);
  const [membersResult, groupsResult] = await Promise.all([
    supabase.from("class_members").select("class_id, user_id").in("class_id", classIds),
    supabase.from("groups").select("class_id, id").in("class_id", classIds),
  ]);

  const memberRows = membersResult.data || [];
  const groupRows = groupsResult.data || [];

  return classes.map((classItem) => ({
    ...classItem,
    student_count: memberRows.filter((row) => row.class_id === classItem.id).length,
    group_count: groupRows.filter((row) => row.class_id === classItem.id).length,
  }));
}

export async function getStudentClasses(userId) {
  const supabase = getSupabaseAdmin();
  const membershipResult = await supabase
    .from("class_members")
    .select("class_id, group_id")
    .eq("user_id", userId);

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const memberships = membershipResult.data || [];
  if (!memberships.length) {
    return [];
  }

  const classIds = memberships.map((item) => item.class_id);
  const groupIds = memberships.map((item) => item.group_id).filter(Boolean);

  const [classesResult, groupsResult] = await Promise.all([
    supabase.from("classes").select("*").in("id", classIds).order("created_at", { ascending: false }),
    groupIds.length
      ? supabase.from("groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
  ]);

  if (classesResult.error) {
    throw classesResult.error;
  }

  const groupMap = new Map((groupsResult.data || []).map((group) => [group.id, group.name]));
  const membershipMap = new Map(memberships.map((item) => [item.class_id, item]));

  return (classesResult.data || []).map((classItem) => {
    const membership = membershipMap.get(classItem.id);
    return {
      ...classItem,
      group_id: membership?.group_id || null,
      group_name: membership?.group_id ? groupMap.get(membership.group_id) || null : null,
    };
  });
}

export async function getClassDetail(classId) {
  const supabase = getSupabaseAdmin();
  const classResult = await supabase.from("classes").select("*").eq("id", classId).maybeSingle();

  if (classResult.error || !classResult.data) {
    return null;
  }

  const [groupsResult, membershipsResult, noticesResult] = await Promise.all([
    supabase.from("groups").select("*").eq("class_id", classId).order("created_at", { ascending: true }),
    supabase.from("class_members").select("user_id, group_id, joined_at").eq("class_id", classId),
    supabase.from("notices").select("*").eq("class_id", classId).order("created_at", { ascending: false }),
  ]);

  const memberships = membershipsResult.data || [];
  const userIds = memberships.map((item) => item.user_id);
  const authorIds = [...new Set((noticesResult.data || []).map((item) => item.created_by))];
  const relatedUserIds = [...new Set([...userIds, ...authorIds])];
  const groupIds = memberships.map((item) => item.group_id).filter(Boolean);

  const [usersResult, groupNameResult] = await Promise.all([
    relatedUserIds.length
      ? supabase.from("users").select("id, name, email").in("id", relatedUserIds)
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? supabase.from("groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map((usersResult.data || []).map((user) => [user.id, user]));
  const groupMap = new Map((groupNameResult.data || []).map((group) => [group.id, group.name]));

  const students = memberships
    .map((membership) => {
      const user = userMap.get(membership.user_id);
      return {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        group_id: membership.group_id,
        group_name: membership.group_id ? groupMap.get(membership.group_id) || null : null,
        joined_at: membership.joined_at,
      };
    })
    .filter((student) => student.id)
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));

  const notices = (noticesResult.data || []).map((notice) => ({
    ...notice,
    author_name: userMap.get(notice.created_by)?.name || "",
  }));

  return {
    class: classResult.data,
    groups: groupsResult.data || [],
    students,
    notices,
  };
}

export async function getStudentNotices(userId) {
  const supabase = getSupabaseAdmin();
  const membershipsResult = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", userId);

  if (membershipsResult.error) {
    throw membershipsResult.error;
  }

  const classIds = (membershipsResult.data || []).map((item) => item.class_id);
  if (!classIds.length) {
    return [];
  }

  const [noticesResult, classesResult, usersResult] = await Promise.all([
    supabase.from("notices").select("*").in("class_id", classIds).order("created_at", { ascending: false }),
    supabase.from("classes").select("id, name").in("id", classIds),
    supabase.from("users").select("id, name"),
  ]);

  const classMap = new Map((classesResult.data || []).map((item) => [item.id, item.name]));
  const userMap = new Map((usersResult.data || []).map((item) => [item.id, item.name]));

  return (noticesResult.data || []).map((notice) => ({
    ...notice,
    class_name: classMap.get(notice.class_id) || "",
    author_name: userMap.get(notice.created_by) || "",
  }));
}
