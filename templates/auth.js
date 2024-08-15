import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = "{{JWT_SECRET}}"; // Store this securely in environment variables
const HASHED_PASSWORD = "{{HASHED_PASSWORD}}"; // "password", 10

export default async (request, context) => {
  const url = new URL(request.url);
  const isLogin = url.pathname.indexOf("/auth/login") >= 0;
  const isProtected = url.pathname.indexOf("/auth/protected") >= 0;

  switch (request.method) {
    case "POST":
      if (isLogin) {
        const body = await request.json();
        return handleLogin(body, context);
      }
      break;
    case "GET":
      if (isProtected) {
        return handleProtected(request.headers);
      }
      break;
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};

async function handleLogin({ password }, context) {
  try {
    const isMatch = await bcrypt.compare(password, HASHED_PASSWORD);

    if (isMatch) {
      const token = jwt.sign({ user: "username" }, JWT_SECRET, {
        expiresIn: "1h",
      });

      // Sets cookie to token
      context.cookies.set({
        name: "token",
        value: token,
        httpOnly: true,
        secure: true,
        path: "/",
      });

      return new Response(JSON.stringify({ token }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function handleProtected(headers) {
  const token = headers.get("authorization");
  if (!token) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    return new Response(
      JSON.stringify({
        message: "Access granted to protected route",
        user: verified,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const config = {
  path: ["/auth/*"],
};
