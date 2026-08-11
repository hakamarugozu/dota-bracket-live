import { NextResponse } from "next/server";

import { verifySuperAdminRequest } from "@/lib/admin";

export async function GET(
  request: Request,
) {
  const isSuperAdmin =
    await verifySuperAdminRequest(request);

  if (!isSuperAdmin) {
    return NextResponse.json(
      {
        authorized: false,
        message: "Acceso no autorizado.",
      },
      {
        status: 403,
      },
    );
  }

  return NextResponse.json({
    authorized: true,
  });
}