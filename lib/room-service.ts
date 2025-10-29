import { RoomServiceClient, Room } from "livekit-server-sdk";

const roomService = new RoomServiceClient(
  process.env.LIVEKIT_WS_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function createRoom(roomName: string): Promise<Room> {
  try {
    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 10,
    });

    console.log(`Created room: ${room.name}`);
    return room;
  } catch (error) {
    console.error("Error creating room:", error);
    throw error;
  }
}

export async function deleteRoom(roomName: string): Promise<void> {
  try {
    await roomService.deleteRoom(roomName);
    console.log(`Deleted room: ${roomName}`);
  } catch (error) {
    console.error("Error deleting room:", error);
    throw error;
  }
}

export async function listRooms(): Promise<Room[]> {
  try {
    const rooms = await roomService.listRooms();
    return rooms;
  } catch (error) {
    console.error("Error listing rooms:", error);
    throw error;
  }
}
