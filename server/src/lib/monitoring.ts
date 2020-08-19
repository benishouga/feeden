export function showMemory() {
  const memory = process.memoryUsage();
  console.log(
    Object.keys(memory).map((key) => ({ key, GB: Math.floor(((memory as any)[key] / 1024 / 1024 / 1024) * 100) / 100 }))
  );
}
