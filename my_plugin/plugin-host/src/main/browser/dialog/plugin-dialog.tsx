/*
 * @Author: wubing
 * @Date: 2025/05/27 - 12:26:28 PM
 * @FilePath: /workdir/extensions/plugin-host/src/main/browser/dialog/plugin-dialog.tsx
 * Copyright (c) 2023 by BAOSIGHT,All Rights Reserved.
 * @Description:
 */
/** @jsxImportSource @emotion/react */
import { injectable, inject, interfaces } from "@theia/core/shared/inversify";
import { ReactDialog } from "@baosky/platform/lib/browser/common-dialog/react-dialog";
import { DialogProps, Widget } from "@theia/core/lib/browser";
import { bnls } from "@baosky/platform/lib/common/bnls";
import { WebviewWidget } from "../webview/webview";
import { DialogControlElement, WebviewOptions, WebviewPanelOptions, WebviewPanelShowOptions } from "@baosky/plugin";
import { MenuPath } from "@theia/core";

export const WEBVIEW_CONTEXT_MENU: MenuPath = ["webview-context-menu"];

// eslint-disable-next-line
export const PluginDialogFactory = Symbol("PluginDialogFactory");

export interface PluginDialogFactory {
  (props: PluginDialogProps): PluginDialog;
}

/**
 * 弹窗参数
 * @date 2025/05/27 - 12:26:28 PM
 * @author wubing
 *
 * @export
 * @class PluginDialogProps
 * @typedef {PluginDialogProps}
 * @extends {DialogProps}
 */
@injectable()
export class PluginDialogProps extends DialogProps {
  widget: WebviewWidget;
  showOptions: WebviewPanelShowOptions;
  options?: WebviewPanelOptions & WebviewOptions;
}

export type PluginDialogResult = {};

/**
 * 插件弹窗
 * @date 2025/05/27 - 12:39:37 PM
 * @author wubing
 *
 * @export
 * @class PluginDialog
 * @typedef {PluginDialog}
 * @extends {ReactDialog<PluginDialogResult>}
 */
@injectable()
export class PluginDialog extends ReactDialog<PluginDialogResult> {
  private is_persistent: boolean;
  private readonly domMap = new Map<string, HTMLElement>();
  constructor(@inject(PluginDialogProps) protected props: PluginDialogProps) {
    super(props);
    this.appendControlElement(this.props.options?.controlOptions);
    this.is_persistent = this.props.showOptions.preserveData ?? false;
    // this.appendCheckbox(bnls.localizeByDefault("关闭后保留数据"));
    // this.appendCloseButton(bnls.localizeByDefault("关闭"));
    if(props.options?.removeDialogControl)
      this.controlPanel.remove();
    this.update();
  }

  public get value(): PluginDialogResult {
    return {};
  }

  /**
   * 添加自定义控制按钮
   * @date 2025/05/27 - 12:42:08 PM
   * @author wubing
   *
   * @protected
   * @param {?DialogControlElement[]} [controlOptions]
   */
  protected appendControlElement(controlOptions?: DialogControlElement[]) {
    // 创建容器
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "8px";
    controlOptions?.map((args) => {
      const element = document.createElement(args.type);
      element.id = args.id;
      this.domMap.set(args.id, element);
      args.style && Object.assign(element.style, args.style);
      if (args.attributes) {
        Object.entries(args.attributes).forEach(([key, value]) => {
          if (key in element) {
            (element as any)[key] = value;
          } else {
            element.setAttribute(key, String(value));
          }
        });
      }
      args.listenType &&
        element.addEventListener(args.listenType, (e) => {
          const message = {
            id: (e.target as HTMLElement).id,
            type: args.listenType,
          };
          this.props.widget.onMessageEmitter.fire(message);
        });
      args.parentId
        ? this.domMap.get(args.parentId)?.appendChild(element)
        : container.appendChild(element);
    });
    this.controlPanel.appendChild(container);
  }

  // /**
  //  * 是否持久化按钮
  //  * @date 2025/05/27 - 12:41:36 PM
  //  * @author wubing
  //  *
  //  * @protected
  //  * @param {string} text
  //  */
  // protected appendCheckbox(text: string): void {
  //   // 创建容器
  //   const container = document.createElement("div");
  //   container.style.display = "flex";
  //   container.style.alignItems = "center";
  //   container.style.gap = "8px";

  //   const checkBox = document.createElement("input");
  //   checkBox.type = "checkbox";
  //   checkBox.checked = true;
  //   checkBox.style.width = "16px";
  //   checkBox.style.height = "16px";
  //   checkBox.style.margin = "0";

  //   const label = document.createElement("label");
  //   label.textContent = text;
  //   label.style.userSelect = "none";

  //   container.appendChild(checkBox);
  //   container.appendChild(label);
  //   this.controlPanel.appendChild(container);

  //   checkBox.addEventListener("change", (e) => {
  //     this.is_persistent = (e.target as HTMLInputElement).checked;
  //   });
  // }

  protected render(): React.ReactNode {
    return (
      <div
        id="widget-dialog-container"
        className="pluginDialog"
        style={{
          width: this.props.showOptions.size?.width,
          height: this.props.showOptions.size?.height,
        }}
        ref={this.attachWidget.bind(this)}
      />
    );
  }

  /**
   * 挂载webviewWidget到dialog
   * @date 2025/05/27 - 12:42:27 PM
   * @author wubing
   *
   * @private
   * @param {(HTMLDivElement | null)} container
   */
  private attachWidget(container: HTMLDivElement | null): void {
    if (container && !container.contains(this.props.widget.node)) {
      container.appendChild(this.props.widget.node);
      this.props.widget.setFlag(Widget.Flag.IsAttached);
      if (this.props.widget.isAttached) {
        Widget.detach(this.props.widget);
      }
      Widget.attach(this.props.widget, container);
      this.props.widget.setFlag(Widget.Flag.IsVisible);
    }
  }

  /**
   * 销毁
   * @date 2025/05/27 - 12:43:50 PM
   * @author wubing
   */
  dispose(): void {
    delete (window as any).baosky;
    if (!this.is_persistent) {
      this.props.widget.clearFlag(Widget.Flag.IsAttached);
      this.props.widget.dispose();
    }
    super.dispose();
  }
}

// eslint-disable-next-line
export const bindPluginDialog = (bind: interfaces.Bind): void => {
  bind(PluginDialogFactory).toFactory(
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    (ctx) => (props: any) => {
      const child = ctx.container.createChild();
      child.bind(PluginDialogProps).toConstantValue({
        ...props,
      });
      child.bind(PluginDialog).toSelf().inSingletonScope();
      return child.get(PluginDialog);
    }
  );
};
