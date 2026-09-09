import { NextResponse } from "next/server";

export async function GET() {
  await new Promise(r => setTimeout(r, 600));
  
  return NextResponse.json([
    { role: "ai", content: "I see you're starting on the `group_by_first_letter` function! To begin, what kind of data structure allows us to map a key (like a first letter) to a list of values?" },
    { role: "user", content: "A dictionary?" },
    { role: "ai", content: "Exactly. Try initializing an empty dictionary on line 2, and then loop over the `words` array." }
  ]);
}
