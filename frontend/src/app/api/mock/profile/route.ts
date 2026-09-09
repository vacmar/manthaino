import { NextResponse } from "next/server";

export async function GET() {
  await new Promise(r => setTimeout(r, 600));
  
  return NextResponse.json([
    { name: "Variables", weight: 100, verified: true },
    { name: "Loops", weight: 90, verified: true },
    { name: "Functions", weight: 85, verified: true },
    { name: "HashMaps", weight: 20, verified: false },
    { name: "Binary Trees", weight: 0, verified: false },
  ]);
}
