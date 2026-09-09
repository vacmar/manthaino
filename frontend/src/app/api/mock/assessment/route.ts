import { NextResponse } from "next/server";

export async function GET() {
  await new Promise(r => setTimeout(r, 450));
  
  return NextResponse.json({
    title: "HashMaps & Dictionaries",
    description: "Prove your capability by writing a function that groups an array of strings by their first letter using a dictionary.",
    defaultCode: "def group_by_first_letter(words):\n    # Write your solution here\n    pass"
  });
}
