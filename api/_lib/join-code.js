const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode() {
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}
