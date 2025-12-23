import * as theia from '@baosky/plugin';
import { TaskDto } from '../../common';
import * as Converter from '../type-converters';

export class TaskProviderAdapter {

    constructor(private readonly provider: theia.TaskProvider) { }

    provideTasks(token: theia.CancellationToken): Promise<TaskDto[]> {
        return Promise.resolve(this.provider.provideTasks(token)).then(tasks => {
            if (!Array.isArray(tasks)) {
                return [];
            }
            const result: TaskDto[] = [];
            for (const task of tasks) {
                const data = Converter.fromTask(task);
                if (!data) {
                    continue;
                }

                result.push(data);
            }
            return result;
        });
    }

    async resolveTask(task: TaskDto, token: theia.CancellationToken): Promise<TaskDto> {
        if (typeof this.provider.resolveTask !== 'function') {
            return task;
        }

        const item = Converter.toTask(task);
        if (!item) {
            return task;
        }

        const resolved = await this.provider.resolveTask(item, token);
        const converted = resolved ? Converter.fromTask(resolved) : Converter.fromTask(item);
        return converted ?? task;
    }
}
