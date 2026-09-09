import { NextResponse } from "next/server";

export async function GET() {
  await new Promise(r => setTimeout(r, 700));
  
  return NextResponse.json({
    goal: "Master Python Data Structures",
    progress: 33,
    nodes: [
      { id: "course_001", title: "Variables & Types", status: "completed", tier: 1 },
      { id: "course_002", title: "Loops & Iteration", status: "completed", tier: 1 },
      { id: "course_101", title: "HashMaps & Dictionaries", status: "active", tier: 2 },
      { id: "course_102", title: "Binary Trees", status: "locked", tier: 3 },
      { id: "course_103", title: "Graph Traversal", status: "locked", tier: 3 },
    ]
  });
}
