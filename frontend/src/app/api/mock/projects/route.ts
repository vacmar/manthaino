import { NextResponse } from "next/server";

export async function GET() {
  await new Promise(r => setTimeout(r, 500));
  
  return NextResponse.json({
    title: "Build a Scalable API",
    description: "Apply your knowledge of Python types, asynchronous programming, and data structures to build a highly scalable web service.",
    tasks: [
      { id: 1, title: "Initialize FastAPI Server", completed: true },
      { id: 2, title: "Define Pydantic Schemas", completed: true },
      { id: 3, title: "Implement Redis Caching", completed: false },
      { id: 4, title: "Write Pytest Suite", completed: false },
    ]
  });
}
