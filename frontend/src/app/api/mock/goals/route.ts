import { NextResponse } from "next/server";

export async function GET() {
  await new Promise(r => setTimeout(r, 400));
  
  return NextResponse.json([
    { title: "Master Python Data Structures", active: true, progress: 33 },
    { title: "Learn System Design", active: false, progress: 0 },
    { title: "Understand Vector Databases", active: false, progress: 0 },
  ]);
}
