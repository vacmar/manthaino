import { NextResponse } from "next/server";

export async function GET() {
  await new Promise(r => setTimeout(r, 500)); // Simulate network latency
  
  return NextResponse.json([
    { id: "path_ds", title: "Data Science & ML", description: "Master Python, Pandas, and Scikit-Learn to build predictive models.", icon: "BrainCircuit" },
    { id: "path_swe", title: "Software Engineering", description: "Learn system design, backend architectures, and scalable APIs.", icon: "TerminalSquare" },
    { id: "path_de", title: "Data Engineering", description: "Build robust pipelines, understand distributed systems and data warehousing.", icon: "Database" },
  ]);
}
