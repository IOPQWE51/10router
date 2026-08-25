import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { setDashboardAuthCookie } from "@/lib/auth/dashboardSession";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "9router-default-secret-change-me"
);

export async function POST(request) {
  try {
    const { password } = await request.json();
    const settings = await getSettings();

    // Default password is '123456' if not set
    const storedHash = settings.password;

    let isValid = false;
    if (!storedHash) {
      isValid = password === "123456";
    } else {
      isValid = await bcrypt.compare(password, storedHash);
    }

    if (isValid) {
      const token = await new SignJWT({ authenticated: true })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .sign(SECRET);

      const cookieStore = await cookies();
      await setDashboardAuthCookie(cookieStore, request);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
