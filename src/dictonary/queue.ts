type Task = () => Promise<void>;
export class Queue {
  private q: Task[] = [];

  push(task: Task) {
    const free = !this.q.length;
    this.q.push(task);
    if (free) this.awake();
  }

  awake() {
    this.q[0]?.().finally(() => {
      this.q.shift();
      this.awake();
    });
  }
}
