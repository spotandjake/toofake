// Types
export interface MemoryImage {
  url: string;
  width: number;
  height: number;
}
// TODO: Consider using a library to handle this typechecking problem
const isMemoryImage = (
  maybeMemoryImage: unknown
): maybeMemoryImage is MemoryImage => {
  if (typeof maybeMemoryImage != 'object' || maybeMemoryImage == null)
    return false;
  if (
    !('url' in maybeMemoryImage) ||
    typeof (maybeMemoryImage as any).url != 'string'
  )
    return false;
  if (
    !('width' in maybeMemoryImage) ||
    typeof (maybeMemoryImage as any).width != 'number'
  )
    return false;
  if (
    !('height' in maybeMemoryImage) ||
    typeof (maybeMemoryImage as any).height != 'number'
  )
    return false;
  return true;
};
interface RawMemory {
  id: string;
  thumbnail: MemoryImage;
  primary: MemoryImage;
  secondary: MemoryImage;
  isLate: boolean;
  memoryDay: string;
  location: { latitude: number; longitude: number } | undefined;
}
const isRawMemory = (maybeMemory: unknown): maybeMemory is RawMemory => {
  if (typeof maybeMemory != 'object' || maybeMemory == null) return false;
  if (!('id' in maybeMemory) || typeof (maybeMemory as any).id != 'string')
    return false;
  if (
    !('thumbnail' in maybeMemory) ||
    !isMemoryImage((maybeMemory as any).thumbnail)
  )
    return false;
  if (
    !('primary' in maybeMemory) ||
    !isMemoryImage((maybeMemory as any).primary)
  )
    return false;
  if (
    !('secondary' in maybeMemory) ||
    !isMemoryImage((maybeMemory as any).secondary)
  )
    return false;
  if (
    !('isLate' in maybeMemory) ||
    typeof (maybeMemory as any).isLate != 'boolean'
  )
    return false;
  if (
    !('memoryDay' in maybeMemory) ||
    typeof (maybeMemory as any).memoryDay != 'string'
  )
    return false;
  if (
    !('location' in maybeMemory) ||
    (maybeMemory as any).location != undefined
  ) {
    if (
      !('latitude' in (maybeMemory as any).location) ||
      typeof (maybeMemory as any).location.latitude != 'number'
    )
      return false;
    if (
      !('longitude' in (maybeMemory as any).location) ||
      typeof (maybeMemory as any).location.longitude != 'number'
    )
      return false;
  }
  return true;
};
export interface Memory extends Omit<RawMemory, 'memoryDay'> {
  memoryDay: Date;
}
// TooFake
export default class TooFake {
  private token: string | null = null;
  constructor() {}
  // Internal
  private getToken(): string {
    // TODO: Make this more secure
    if (this.token == null) this.token = localStorage.getItem('token');
    // TODO: Handle null token
    if (this.token == null) throw 'Invalid Token';

    return this.token;
  }
  // Interface
  public async getMemories(): Promise<Memory[] | string> {
    // Fetch Memories
    const response = await fetch('/api/memories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: this.getToken(),
      }),
    });
    if (response.status != 200) {
      return 'Invalid Response When Requesting Memories';
    }
    // Parse Response
    const rawMemories: unknown = await response.json().catch(() => ({}));
    if (
      typeof rawMemories != 'object' ||
      rawMemories == null ||
      !('data' in rawMemories) ||
      !Array.isArray(rawMemories.data)
    ) {
      return 'Invalid Data From Memories Request';
    }
    // Parse Memories
    const memories: Memory[] = [];
    for (const memory of rawMemories.data as unknown[]) {
      if (!isRawMemory(memory)) {
        return 'Invalid Data From Memories Request';
      }
      const memoryDay = new Date(memory.memoryDay);
      memoryDay.setDate(memoryDay.getDate() + 1); // Memory date is one day off for some reason?
      memories.push({ ...memory, memoryDay: memoryDay });
    }
    return memories;
  }
}
