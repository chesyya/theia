import { BaseDirectiveHandler } from "@baosky/platform/lib/browser/directive/base-directive-handler";
import { ProjectFileService } from '@baosky/platform/lib/browser/project/service/project-file-service'
import { ILogger, URI } from "@theia/core";
import { inject, interfaces, unmanaged } from "@theia/core/shared/inversify";
import { logTime } from '@baosky/platform/lib/common/performance/log-time'
import { DirectiveContext } from "@baosky/platform/lib/browser/directive/directive-context";
import { DirectiveHandler } from "@baosky/platform/lib/browser/directive/directive-handler";
import { BaseDirectiveHandlerWithPayload } from '@baosky/platform/lib/browser/directive/base-directive-handler-with-payload'
import { bnls } from "@baosky/platform/lib/common/bnls";
import path from "path"
export interface PluginFileNodeDTO {
    /**
     * 文件目录。
     * @date 6/13/2023 - 11:01:31 AM
     * @author 沈杰
     *
     * @type {string}
     */
    parentDir: string;
    /**
     * 文件夹名。
     * @date 6/13/2023 - 11:01:40 AM
     * @author 沈杰
     *
     * @type {string}
     */
    name: string;

    priority?: number;

    undoPriority?: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const AddFileNodeDirectiveHandlerFactory = Symbol("AddFileNodeDirectiveHandlerFactory")

/**
 * 创建文件夹指令处理器工厂方法。
 * @date 7/11/2023 - 8:24:19 AM
 * @author 沈杰
 *
 * @export
 * @interface AddNodeDirectiveHandlerFactory
 * @typedef {AddNodeDirectiveHandlerFactory}
 */
export interface AddFileNodeDirectiveHandlerFactory {
    (): AddFileNodeDirectiveHandler;
}
export class AddFileNodeDirectiveHandler extends BaseDirectiveHandlerWithPayload<PluginFileNodeDTO> {
    @inject(ProjectFileService) private readonly projectFileService: ProjectFileService;
    private readonly logger: ILogger;
    /**
     * Creates an instance of MakeDirDirectiveHandler.
     * @date 6/20/2023 - 7:38:06 AM
     * @author 沈杰
     *
     * @constructor
     * @param {ILogger} rootLogger
     */
    constructor(@inject(ILogger) private readonly rootLogger: ILogger) {
        super();
        this.logger = rootLogger.child(AddFileNodeDirectiveHandler.name);
    }

    /**
     * 执行创建文件夹指令。
     * 文件夹存在时，将抛出异常。
     * @date 7/11/2023 - 8:23:20 AM
     * @author 沈杰
     *
     * @public
     * @async
     * @param {?(DirectiveContext | undefined)} [ctx]
     * @returns {Promise<DirectiveHandler>}
     */
    @logTime()
    public async do(ctx?: DirectiveContext | undefined): Promise<DirectiveHandler> {
        if (!this.payload) {
            throw new Error(bnls.localizeByDefault("指令处理器尚未初始化。"));
        }
        const filePath: string = path.join(this.payload.parentDir, this.payload.name)
        const fileURI = URI.fromFilePath(filePath);
        if (await this.projectFileService.exists(fileURI)) {
            throw new Error(bnls.localizeByDefault("已经存在文件夹{0}。", filePath))
        }
        return this.projectFileService.createFolder(fileURI)
            .then(() => {
                this.logger.debug(bnls.localizeByDefault("创建文件夹{0}成功。", filePath));
                if (ctx) {
                    if (ctx["files"] && ctx["files"].findIndex(file => fileURI.isEqual(file)) === -1) {
                        ctx["files"].push(fileURI)
                    } else {
                        ctx["files"] = [fileURI]
                    }
                }
                return new UndoAddNodeDirectiveHandler(fileURI, this, this.projectFileService, this.rootLogger, this.payload.undoPriority)
            })
    }

    /**
     * 文件夹名。
     * @date 7/11/2023 - 8:24:02 AM
     * @author 沈杰
     *
     * @public
     * @readonly
     * @type {string}
     */
    public get name(): string {
        return bnls.localizeByDefault("创建文件夹", this.payload.name)
    }

    /**
     *
     */
    public get priority(): number {
        return this.payload.priority ?? super.priority;
    }
}

/**
 * 插销创建文件夹操作，直接删除已经创建的文件夹，并将创建的处理器直接返回。
 * @date 6/13/2023 - 11:26:38 AM
 * @author 沈杰
 *
 * @class UndoCreateFileDirectiveHandler
 * @typedef {UndoMakeDirDirectiveHandler}
 * @extends {BaseDirectiveHandler}
 */
class UndoAddNodeDirectiveHandler extends BaseDirectiveHandler {
    private readonly logger: ILogger;
    /**
     * Creates an instance of UndoMakeDirDirectiveHandler.
     * @date 7/11/2023 - 8:23:13 AM
     * @author 沈杰
     *
     * @constructor
     * @param {URI} file
     * @param {MakeDirDirectiveHandler} redo
     * @param {ProjectFileService} projectFileService
     * @param {ILogger} rootLogger
     */
    constructor(
        @unmanaged() private readonly file: URI,
        @unmanaged() private readonly redo: AddFileNodeDirectiveHandler,
        @unmanaged() private readonly projectFileService: ProjectFileService,
        @unmanaged() rootLogger: ILogger,
        @unmanaged() private readonly undoPriority?: number
    ) {
        super()
        this.logger = rootLogger.child(UndoAddNodeDirectiveHandler.name)
    }

    /**
     * 当文件存在时，直接删除即可。
     * @date 6/13/2023 - 11:27:08 AM
     * @author 沈杰
     *
     * @public
     * @async
     * @param {?(DirectiveContext | undefined)} [ctx]
     * @returns {Promise<DirectiveHandler>}
     */
    public async do(ctx?: DirectiveContext | undefined): Promise<DirectiveHandler> {
        if (await this.projectFileService.exists(this.file)) {
            await this.projectFileService.delete(this.file, {
                recursive: true
            });
            this.logger.debug(`删除文件夹${this.file.path.fsPath()}成功。`)
        }
        return this.redo;
    }

    /**
     *
     */
    public get priority(): number {
        return this.undoPriority ?? super.priority;
    }
}

/**
 * 绑定创建文件的指令处理器的工厂类。
 * @date 6/13/2023 - 10:59:05 AM
 * @author 沈杰
 *
 * @export
 * @param {interfaces.Bind} bind
 */
export function bindAddFileNodeDirectiveHandlerFactory(bind: interfaces.Bind): void {

    bind(AddFileNodeDirectiveHandlerFactory).toFactory(ctx =>
        () => {
            const child = ctx.container.createChild();

            child.bind(AddFileNodeDirectiveHandler).toSelf().inTransientScope()
            return child.get(AddFileNodeDirectiveHandler);
        })

}