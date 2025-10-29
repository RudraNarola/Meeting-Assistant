import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get meetings for the current user (without orderBy to avoid index requirement)
    const meetingsRef = collection(db, "meetings");
    const q = query(
      meetingsRef,
      where("hostId", "==", session.user.email)
      // Temporarily removed orderBy to avoid index requirement
      // orderBy("scheduledAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const meetings = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
