
/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { injectable, inject, interfaces } from "@theia/core/shared/inversify";
import { ReactDialog } from "@baosky/platform/lib/browser/common-dialog/react-dialog";
import { DialogProps } from "@theia/core/lib/browser";
import { ReactNode, useState } from "@theia/core/shared/react";
import { CommonUploader } from "@baosky/platform/lib/browser/common-components/uploader/common-uploader";
import { bnls } from "@baosky/platform/lib/common/bnls";
import { CommonInfoDialogFactory } from "@baosky/platform/lib/browser/common-dialog/common-info-dialog";
import { BaoskyConfigServer } from "@baosky/platform/lib/common/baosky-config/baosky-config-server";
import { UserLoginController } from "@baosky/project/lib/browser/es-server/controller/user-login-controller";

const localizePrompt = bnls.localizeByDefault("提示");
const localizeFormatMismatch = bnls.localizeByDefault("文件格式不匹配，请重新选择待安装插件");
const localizeConfirm = bnls.localizeByDefault("确定");
const localizeCancel = bnls.localizeByDefault("取消");
const localizeSelectPlugin = bnls.localizeByDefault('选择插件');

// eslint-disable-next-line
export const PluginInstallerDialogFactory = Symbol("PluginInstallerDialogFactory");

export interface PluginInstallerDialogFactory {
    (props: PluginInstallerDialogProps): PluginInstallerDialog;
}


/**
 * @description 插件安装弹窗的props
 * @date 2025/04/23 - 17:53:40 PM
 * @author wubing
 *
 * @export
 * @class PluginInstallerDialogProps
 * @typedef {PluginInstallerDialogProps}
 * @extends {DialogProps}
 */
@injectable()
export class PluginInstallerDialogProps extends DialogProps {

}

export type PluginInstallerDialogResult = {
    uploadedFile: File;
    installForAll?: boolean;
};


/**
 * @description 插件安装弹窗
 * @date 2025/04/23 - 17:53:53 PM
 * @author wubing
 *
 * @export
 * @class PluginInstallerDialog
 * @typedef {PluginInstallerDialog}
 * @extends {ReactDialog<PluginInstallerDialogResult>}
 */
@injectable()
export class PluginInstallerDialog extends ReactDialog<PluginInstallerDialogResult> {

    protected uploadedFile: any = null;
    protected _isAdmin: boolean = false;
    protected installForAll: boolean = false;

    @inject(CommonInfoDialogFactory) protected readonly commonInfoDialogFactory: CommonInfoDialogFactory;

    constructor(
        @inject(PluginInstallerDialogProps)protected props: PluginInstallerDialogProps,
        @inject(BaoskyConfigServer)protected baoskyConfigServer: BaoskyConfigServer,
        @inject(UserLoginController) protected readonly userLoginController: UserLoginController
    ) {
        super(props);

        this.addClass("plugin-installer-dialog");

        this.appendAcceptButton(localizeConfirm);
        // this.acceptButton?.classList.add("project-archive-dialog-control-accept-button");
        (this.acceptButton as HTMLButtonElement).disabled = true;
        this.appendCloseButton(localizeCancel);
        this.closeButton?.classList.add("plugin-installer-dialog-control-close-button");

        this.update();
        this.updateUserState();
    }

    public get value(): PluginInstallerDialogResult {
        return {
            uploadedFile: this.uploadedFile!,
            installForAll: this.installForAll
        };
    }

    protected setAcceptButton(): void {
        if (this.acceptButton) {
            (this.acceptButton as HTMLButtonElement).disabled = (this.uploadedFile == null || this.uploadedFile.size === 0);
        }
    }

        protected async updateUserState(): Promise<void> {
        if (await this.baoskyConfigServer.getESServerMode()) {
            try {
                this._isAdmin = this.userLoginController.isAdminLogin();
            } catch (error) {
                console.warn("[PluginInstallerDialog] 获取用户信息失败", error);
            }
        }
    }

    protected render(): ReactNode {
        return (
            <>
            <this.RenderBlock/>
            </>
        )
    }

    // eslint-disable-next-line
    protected RenderBlock = () => {
        this.setAcceptButton();
        // const checkboxRefs = new Array(this.checkboxList.length).fill(useRef(null)); // checkbox的状态开始对应this._checkList
        const [fileName, setFileName] = useState('');
        const [isFileEmpty, setIsFileEmpty] = useState(false);
        const [installForAll, setInstallForAll] = useState(false);

        const bgStyle = css({
            position: "absolute",
            right: "50px",
            bottom: "2px",
            // mixBlendMode: "overlay",
            fontSize: "180px",
            color: "#EDF5FF",
            zIndex: "-1",
        })

        const typeStyle = css({
            display: "flex",
            alignItems: "center",
            justifyContent: "start",
            width: "480px",
            margin: "10px 0px 5px 50px",
            "&>div": {
                position: "relative",
                input: {
                height: "24px",
                border: "1px solid rgba(239,239,239,1)",
                width: "280px",
                },
                'input[type="radio"]': {
                    border: '3px solid var(--theia-input-check-bgColor)',
                },
            },
            ".property-radio": {
                minWidth: "150px"
            },
            ".rc-checkbox": {
                paddingRight: "10px"
            },
            ".radiobox-group-column": {
                display: "flex",
                justifyContent: "start",
                width: "290px",
                marginLeft: "7px",
                ".item": {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    lineHeight: "24PX"
                },
                input: {
                    height: "12px !important",
                    width: "12px !important"
                }
            },
            ".rc-checkbox-input:focus": {
                outlineColor: "transparent"
            }
        })

        return (
            <div className="plugin-installer-dialog-content" style={{position: "relative", paddingTop: "8px"}}>
                <div style={{margin: "30px 80px 50px 80px"}}>
                    <div className="plugin-installer-dialog-content-title" style={{width: "500px"}} >
                        <div className="plugin-installer-dialog-content-title-content">{localizeSelectPlugin}</div>
                    </div>
                        <CommonUploader
                            accept={{
                                "text/bsx": [".bsx"],
                                // "application/zip": [],
                                // "application/x-tar": [],
                            }}
                            multiple={false}
                            onDrop={(files):void=>{
                                if(files.length > 0) {
                                    this.uploadedFile = files[0]; // files是一个数组，[File]
                                    setFileName(this.uploadedFile.name);
                                    setIsFileEmpty(this.uploadedFile.size === 0)

                                } else {
                                    this.uploadedFile = null;
                                    setFileName("");
                                    // 上传文件格式不对的提示弹窗
                                    const infoDialog = this.commonInfoDialogFactory({
                                        title: localizePrompt,
                                        msg: localizeFormatMismatch,
                                        level: "error"
                                    })
                                    infoDialog.open();
                                }

                                this.setAcceptButton();
                            }}
                            style={{
                                width: "400px",
                                height: "80px",
                                cursor: "pointer",
                            }}
                        />
                        {fileName && isFileEmpty && <div style={{background: "#FFE5E8",
                                                height: "36px",
                                                marginTop: "4px",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                padding: "0 8px",
                                                fontSize: "12px",
                                                alignItems: "center"}}>
                                        <div>{bnls.localizeByDefault('上传的文件 {0} 为空', fileName)}</div>
                                        <div> <i className="iconfont icon-error1" style={{color: "#FF001F", fontSize: "12px"}} /> </div>
                                    </div>}
                        {fileName && !isFileEmpty && <div style={{background: "#2477FC07",
                                                height: "36px",
                                                marginTop: "4px",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                padding: "0 8px",
                                                fontSize: "12px",
                                                alignItems: "center"}}>
                                        <div style={{overflow: "hidden", textOverflow: "ellipsis"}}  title={fileName}>{fileName}</div>
                                    </div>}
                    {this._isAdmin && (
                        <div style={{ marginTop: "20px" }}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={installForAll}
                                    onChange={e => {
                                        this.installForAll = e.target.checked;
                                        setInstallForAll(e.target.checked)
                                    }}
                                />
                                {bnls.localizeByDefault("安装到共享目录（所有用户可用）")}
                            </label>
                        </div>
                    )}

                </div>

            </div>
        );
    }
}

// eslint-disable-next-line
export const bindPluginInstallerDialog = (bind: interfaces.Bind): void => {
    bind(PluginInstallerDialogFactory).toFactory(
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        (ctx) => (props: any) => {
            const child = ctx.container.createChild();
            child.bind(PluginInstallerDialogProps).toConstantValue({
                ...props
        });
        child.bind(PluginInstallerDialog).toSelf().inSingletonScope();
        return child.get(PluginInstallerDialog);
        }
    );
}

