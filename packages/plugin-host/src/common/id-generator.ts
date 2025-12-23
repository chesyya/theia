export class IdGenerator {
    private lastId: number;
    constructor(private prefix: string) {
        this.lastId = 0;
    }

    nextId(): string {
        return this.prefix + (++this.lastId);
    }
}
