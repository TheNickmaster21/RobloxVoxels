export type Tuple<T> = [T, number];

export class PriorityQueue<T> {
    heap: Tuple<T>[] = [];

    constructor() {}

    insert(val: T, priority: number): void {
        if (!this.heap.size() || this.heap[this.heap.size() - 1][1] > priority) {
            this.heap.push([ val, priority ]);
            return;
        }

        const tmp: Tuple<T>[] = [];
        let found = false;

        for (let i = 0; i < this.heap.size(); i++) {
            const p = this.heap[i][1];

            if (priority >= p && !found) {
                tmp.push([ val, priority ]);
                found = true;
            }

            tmp.push(this.heap[i]);
        }

        this.heap = tmp;
    }

    shift(): T | undefined {
        const tuple = this.heap.shift();

        return tuple ? tuple[0] : undefined;
    }

    pop(): T | undefined {
        const tuple = this.heap.pop();

        return tuple ? tuple[0] : undefined;
    }

    priorities(): number[] {
        return this.heap.map(([ _, p ]) => p);
    }

    values(): T[] {
        return this.heap.map(([ val ]) => val);
    }

    size(): number {
        return this.heap.size();
    }

    toArray(): T[] {
        return this.heap.map(([ val ]) => val);
    }
}
