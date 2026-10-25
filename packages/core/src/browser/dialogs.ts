// *****************************************************************************
// Copyright (C) 2017 TypeFox and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject, unmanaged } from 'inversify';
import { Disposable, MaybePromise, CancellationTokenSource, nls } from '../common';
import { generateUuid } from '../common/uuid';
import { Key } from './keyboard/keys';
import { Widget, BaseWidget, Message, addKeyListener, codiconArray } from './widgets/widget';
import { FrontendApplicationContribution } from './frontend-application-contribution';

@injectable()
export class DialogProps {
    readonly title: string;
    /**
     * Determines the maximum width of the dialog in pixels.
     * Default value is undefined, which would result in the css property 'max-width: none' being applied to the dialog.
     */
    maxWidth?: number;
    /**
     * Determine the word wrapping behavior for content in the dialog.
     * - `normal`: breaks words at allowed break points.
     * - `break-word`: breaks otherwise unbreakable words.
     * - `initial`: sets the property to it's default value.
     * - `inherit`: inherit this property from it's parent element.
     * Default value is undefined, which would result in the css property 'word-wrap' not being applied to the dialog.
     */
    wordWrap?: 'normal' | 'break-word' | 'initial' | 'inherit';
}

export type DialogMode = 'open' | 'preview';

export type DialogError = string | boolean | {
    message: string
    result: boolean
};
export namespace DialogError {
    export function getResult(error: DialogError): boolean {
        if (typeof error === 'string') {
            return !error.length;
        }
        if (typeof error === 'boolean') {
            return error;
        }
        return error.result;
    }
    export function getMessage(error: DialogError): string {
        if (typeof error === 'string') {
            return error;
        }
        if (typeof error === 'boolean') {
            return '';
        }
        return error.message;
    }
}

export namespace Dialog {
    export const YES = nls.localizeByDefault('Yes');
    export const NO = nls.localizeByDefault('No');
    export const OK = nls.localizeByDefault('OK');
    export const CANCEL = nls.localizeByDefault('Cancel');
}

export type DialogAutomationValue = string | number | boolean | null | DialogAutomationValue[] | {
    [key: string]: DialogAutomationValue
};

export interface DialogAutomationState {
    [key: string]: DialogAutomationValue
}

export interface DialogAutomationControl {
    readonly available: boolean;
    readonly enabled?: boolean;
    readonly label?: string;
}

export interface DialogAutomationSnapshot {
    readonly title: string;
    readonly contentText: string;
    readonly validationMessage?: string;
    readonly confirm: DialogAutomationControl;
    readonly cancel: DialogAutomationControl;
}

export interface DialogAutomationConfirmResult {
    readonly closed: boolean;
    readonly validationMessage?: string;
}

export interface DialogAutomationAction {
    readonly id: string;
    readonly label: string;
    readonly enabled: boolean;
}

/**
 * A serializable, semantic automation surface for a dialog. It deliberately
 * does not expose the dialog instance or any DOM nodes.
 */
export interface DialogAutomation {
    getAutomationSnapshot(): DialogAutomationSnapshot;
    getAutomationState(): DialogAutomationState;
    setAutomationState(patch: DialogAutomationState): Promise<void>;
    confirmFromAutomation(): Promise<DialogAutomationConfirmResult>;
    cancelFromAutomation(): Promise<void>;
    getAutomationActions(): readonly DialogAutomationAction[];
    invokeAutomationAction(id: string): Promise<void>;
}

export interface ActiveDialogAutomation {
    readonly id: string;
    readonly dialog: DialogAutomation;
}

@injectable()
export class DialogOverlayService implements FrontendApplicationContribution {

    protected static INSTANCE: DialogOverlayService;

    static get(): DialogOverlayService {
        return DialogOverlayService.INSTANCE;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly dialogs: AbstractDialog<any>[] = [];
    protected readonly documents: Document[] = [];
    protected readonly automationDialogs = new Map<string, AbstractDialog<unknown>>();
    protected readonly automationIds = new WeakMap<AbstractDialog<unknown>, string>();

    constructor() {
    }

    initialize(): void {
        DialogOverlayService.INSTANCE = this;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected get currentDialog(): AbstractDialog<any> | undefined {
        return this.dialogs[0];
    }

    getActiveDialogAutomation(): ActiveDialogAutomation | undefined {
        const dialog = this.currentDialog;
        if (!dialog) {
            return undefined;
        }
        const id = this.automationIds.get(dialog);
        return id ? { id, dialog } : undefined;
    }

    getDialogAutomation(id: string): DialogAutomation | undefined {
        return this.automationDialogs.get(id);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    push(dialog: AbstractDialog<any>): Disposable {
        if (this.documents.findIndex(document => document === dialog.node.ownerDocument) < 0) {
            addKeyListener(dialog.node.ownerDocument.body, Key.ENTER, e => this.handleEnter(e));
            addKeyListener(dialog.node.ownerDocument.body, Key.ESCAPE, e => this.handleEscape(e));
            this.documents.push(dialog.node.ownerDocument);
        }
        this.dialogs.unshift(dialog);
        const automationId = generateUuid();
        this.automationDialogs.set(automationId, dialog);
        this.automationIds.set(dialog, automationId);
        return Disposable.create(() => {
            const index = this.dialogs.indexOf(dialog);
            if (index > -1) {
                this.dialogs.splice(index, 1);
            }
            this.automationDialogs.delete(automationId);
            if (this.automationIds.get(dialog) === automationId) {
                this.automationIds.delete(dialog);
            }
        });
    }

    protected handleEscape(event: KeyboardEvent): boolean | void {
        const dialog = this.currentDialog;
        if (dialog) {
            return dialog['handleEscape'](event);
        }
        return false;
    }

    protected handleEnter(event: KeyboardEvent): boolean | void {
        const dialog = this.currentDialog;
        if (dialog) {
            return dialog['handleEnter'](event);
        }
        return false;
    }

}

@injectable()
export abstract class AbstractDialog<T> extends BaseWidget implements DialogAutomation {

    protected readonly titleNode: HTMLDivElement;
    protected readonly contentNode: HTMLDivElement;
    protected readonly closeCrossNode: HTMLElement;
    protected readonly controlPanel: HTMLDivElement;
    protected readonly errorMessageNode: HTMLDivElement;

    protected resolve: undefined | ((value: T | undefined) => void);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected reject: undefined | ((reason: any) => void);

    protected closeButton: HTMLButtonElement | undefined;
    protected acceptButton: HTMLButtonElement | undefined;

    protected activeElement: HTMLElement | undefined;

    constructor(
        @unmanaged() protected readonly props: DialogProps,
        @unmanaged() options?: Widget.IOptions
    ) {
        super(options);
        this.id = 'theia-dialog-shell';
        this.addClass('dialogOverlay');
        this.toDispose.push(Disposable.create(() => {
            if (this.reject) {
                Widget.detach(this);
            }
        }));
        const container = this.node.ownerDocument.createElement('div');
        container.classList.add('dialogBlock');
        if (props.maxWidth === undefined) {
            container.setAttribute('style', 'max-width: none');
        } else if (props.maxWidth < 400) {
            container.setAttribute('style', `max-width: ${props.maxWidth}px; min-width: 0px`);
        } else {
            container.setAttribute('style', `max-width: ${props.maxWidth}px`);
        }
        this.node.appendChild(container);

        const titleContentNode = this.node.ownerDocument.createElement('div');
        titleContentNode.classList.add('dialogTitle');
        container.appendChild(titleContentNode);

        this.titleNode = this.node.ownerDocument.createElement('div');
        this.titleNode.textContent = props.title;
        titleContentNode.appendChild(this.titleNode);

        this.closeCrossNode = this.node.ownerDocument.createElement('i');
        this.closeCrossNode.classList.add(...codiconArray('close', true));
        this.closeCrossNode.classList.add('closeButton');
        titleContentNode.appendChild(this.closeCrossNode);

        this.contentNode = this.node.ownerDocument.createElement('div');
        this.contentNode.classList.add('dialogContent');
        if (props.wordWrap !== undefined) {
            this.contentNode.setAttribute('style', `word-wrap: ${props.wordWrap}`);
        }
        container.appendChild(this.contentNode);

        this.controlPanel = this.node.ownerDocument.createElement('div');
        this.controlPanel.classList.add('dialogControl');
        container.appendChild(this.controlPanel);

        this.errorMessageNode = this.node.ownerDocument.createElement('div');
        this.errorMessageNode.classList.add('error');
        this.errorMessageNode.setAttribute('style', 'flex: 2');
        this.controlPanel.appendChild(this.errorMessageNode);

        this.update();
    }

    protected appendCloseButton(text: string = Dialog.CANCEL): HTMLButtonElement {
        return this.closeButton = this.appendButton(text, false);
    }

    protected appendAcceptButton(text: string = Dialog.OK): HTMLButtonElement {
        return this.acceptButton = this.appendButton(text, true);
    }

    protected appendButton(text: string, primary: boolean): HTMLButtonElement {
        const button = this.createButton(text);
        this.controlPanel.appendChild(button);
        button.classList.add(primary ? 'main' : 'secondary');
        return button;
    }

    protected createButton(text: string): HTMLButtonElement {
        const button = document.createElement('button');
        button.classList.add('theia-button');
        button.textContent = text;
        return button;
    }

    protected override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        if (this.closeButton) {
            this.addCloseAction(this.closeButton, 'click');
        }
        if (this.acceptButton) {
            this.addAcceptAction(this.acceptButton, 'click');
        }
        this.addCloseAction(this.closeCrossNode, 'click');
        // TODO: use DI always to create dialog instances
        this.toDisposeOnDetach.push(DialogOverlayService.get().push(this));
    }

    protected handleEscape(event: KeyboardEvent): boolean | void {
        this.close();
    }

    protected handleEnter(event: KeyboardEvent): boolean | void {
        if (event.target instanceof HTMLTextAreaElement) {
            return false;
        }
        this.accept();
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        if (this.acceptButton) {
            this.acceptButton.focus();
        }
    }

    open(disposeOnResolve: boolean = true): Promise<T | undefined> {
        if (this.resolve) {
            return Promise.reject(new Error('The dialog is already opened.'));
        }
        this.activeElement = this.node.ownerDocument.activeElement as HTMLElement;
        return new Promise<T | undefined>((resolve, reject) => {
            this.resolve = value => {
                resolve(value);
            };
            this.reject = reject;
            this.toDisposeOnDetach.push(Disposable.create(() => {
                this.resolve = undefined;
                this.reject = undefined;
            }));

            Widget.attach(this, this.node.ownerDocument.body);
            this.activate();
        }).finally(() => {
            if (disposeOnResolve) {
                this.dispose();
            }
        });
    }

    protected override onCloseRequest(msg: Message): void {
        // super.onCloseRequest() would automatically dispose the dialog, which we don't want because we're reusing it
        if (this.parent) {
            // eslint-disable-next-line no-null/no-null
            this.parent = null;
        } else if (this.isAttached) {
            Widget.detach(this);
        }
    }

    override close(): void {
        if (this.resolve) {
            if (this.activeElement) {
                this.activeElement.focus({ preventScroll: true });
            }
            this.resolve(undefined);
        }
        this.activeElement = undefined;
        super.close();
    }
    protected override onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        this.validate();
    }

    protected validateCancellationSource = new CancellationTokenSource();
    protected async validate(): Promise<void> {
        if (!this.resolve) {
            return;
        }
        this.validateCancellationSource.cancel();
        this.validateCancellationSource = new CancellationTokenSource();
        const token = this.validateCancellationSource.token;
        const value = this.value;
        const error = await this.isValid(value, 'preview');
        if (token.isCancellationRequested) {
            return;
        }
        this.setErrorMessage(error);
    }

    protected acceptCancellationSource = new CancellationTokenSource();
    protected acceptPromise: Promise<void> | undefined;
    protected accept(): Promise<void> {
        const operation = this.doAcceptDialog();
        this.acceptPromise = operation;
        return operation.finally(() => {
            if (this.acceptPromise === operation) {
                this.acceptPromise = undefined;
            }
        });
    }

    protected async doAcceptDialog(): Promise<void> {
        if (!this.resolve) {
            return;
        }
        this.acceptCancellationSource.cancel();
        this.acceptCancellationSource = new CancellationTokenSource();
        const token = this.acceptCancellationSource.token;
        const value = this.value;
        const error = await this.isValid(value, 'open');
        if (token.isCancellationRequested) {
            return;
        }
        if (!DialogError.getResult(error)) {
            this.setErrorMessage(error);
        } else {
            this.resolve(value);
            Widget.detach(this);
        }
    }

    abstract get value(): T;

    /**
     * Return a string of zero-length or true if valid.
     */
    protected isValid(value: T, mode: DialogMode): MaybePromise<DialogError> {
        return '';
    }

    protected setErrorMessage(error: DialogError): void {
        if (this.acceptButton) {
            this.acceptButton.disabled = !DialogError.getResult(error);
        }
        this.errorMessageNode.innerText = DialogError.getMessage(error);
    }

    protected addAction<K extends keyof HTMLElementEventMap>(element: HTMLElement, callback: () => void, ...additionalEventTypes: K[]): void {
        this.addKeyListener(element, Key.ENTER, callback, ...additionalEventTypes);
    }

    protected addCloseAction<K extends keyof HTMLElementEventMap>(element: HTMLElement, ...additionalEventTypes: K[]): void {
        this.addAction(element, () => this.close(), ...additionalEventTypes);
    }

    protected addAcceptAction<K extends keyof HTMLElementEventMap>(element: HTMLElement, ...additionalEventTypes: K[]): void {
        this.addAction(element, () => this.accept(), ...additionalEventTypes);
    }

    getAutomationSnapshot(): DialogAutomationSnapshot {
        const validationMessage = this.normalizeAutomationText(this.errorMessageNode.innerText || this.errorMessageNode.textContent || '');
        return {
            title: this.normalizeAutomationText(this.titleNode.innerText || this.titleNode.textContent || ''),
            contentText: this.normalizeAutomationText(this.contentNode.innerText || this.contentNode.textContent || ''),
            validationMessage: validationMessage || undefined,
            confirm: {
                available: !!this.acceptButton,
                enabled: this.acceptButton ? !this.acceptButton.disabled : undefined,
                label: this.normalizeAutomationLabel(this.acceptButton)
            },
            cancel: {
                available: true,
                label: this.normalizeAutomationLabel(this.closeButton)
            }
        };
    }

    getAutomationState(): DialogAutomationState {
        return {};
    }

    async setAutomationState(patch: DialogAutomationState): Promise<void> {
        if (!patch || Array.isArray(patch) || typeof patch !== 'object') {
            throw new TypeError('Dialog automation state must be an object.');
        }
        this.validateAutomationState(patch);
        await this.applyAutomationState(patch);
        // Rendering is best-effort. The contract guarantees that the state read
        // by `value` has changed before this promise resolves, not that the DOM
        // has committed the corresponding update.
        this.update();
    }

    protected applyAutomationState(_patch: DialogAutomationState): MaybePromise<void> {
        throw this.automationError('DialogStateNotSupportedError', 'This dialog does not expose writable automation state.');
    }

    async confirmFromAutomation(): Promise<DialogAutomationConfirmResult> {
        if (!this.acceptButton) {
            throw this.automationError('DialogActionNotSupportedError', 'This dialog does not expose a standard confirm action.');
        }
        if (this.acceptButton.disabled) {
            await this.accept();
        } else {
            const previousOperation = this.acceptPromise;
            this.acceptButton.click();
            const operation = this.acceptPromise;
            if (operation && operation !== previousOperation) {
                await operation;
            }
        }
        const validationMessage = this.normalizeAutomationText(this.errorMessageNode.innerText || this.errorMessageNode.textContent || '');
        return {
            closed: !this.isAttached,
            validationMessage: validationMessage || undefined
        };
    }

    async cancelFromAutomation(): Promise<void> {
        this.close();
    }

    getAutomationActions(): readonly DialogAutomationAction[] {
        return [];
    }

    async invokeAutomationAction(id: string): Promise<void> {
        throw this.automationError('DialogActionNotSupportedError', `Unknown dialog automation action: ${id}`);
    }

    protected normalizeAutomationText(value: string): string {
        return value.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
    }

    protected normalizeAutomationLabel(button: HTMLButtonElement | undefined): string | undefined {
        if (!button) {
            return undefined;
        }
        const label = this.normalizeAutomationText(button.innerText || button.textContent || '');
        return label || undefined;
    }

    protected validateAutomationState(state: DialogAutomationState): void {
        const validate = (value: unknown, path: string): void => {
            if ((typeof value === 'object' && !value) || typeof value === 'string' || typeof value === 'boolean') {
                return;
            }
            if (typeof value === 'number') {
                if (Number.isFinite(value)) {
                    return;
                }
            } else if (Array.isArray(value)) {
                value.forEach((element, index) => validate(element, `${path}[${index}]`));
                return;
            } else if (typeof value === 'object') {
                Object.entries(value).forEach(([key, element]) => validate(element, `${path}.${key}`));
                return;
            }
            throw this.automationError('InvalidDialogStateError', `Dialog state field '${path}' is not JSON serializable.`);
        };
        Object.entries(state).forEach(([key, value]) => validate(value, key));
    }

    protected automationError(name: string, message: string): Error {
        const error = new Error(message);
        error.name = name;
        return error;
    }

}

@injectable()
export class MessageDialogProps extends DialogProps {
    readonly msg: string | HTMLElement;
}

@injectable()
export class ConfirmDialogProps extends MessageDialogProps {
    readonly cancel?: string;
    readonly ok?: string;
}

export class ConfirmDialog extends AbstractDialog<boolean> {

    protected confirmed = true;

    constructor(
        @inject(ConfirmDialogProps) protected override readonly props: ConfirmDialogProps
    ) {
        super(props);

        this.contentNode.appendChild(this.createMessageNode(this.props.msg));
        this.appendCloseButton(props.cancel);
        this.appendAcceptButton(props.ok);
    }

    protected override onCloseRequest(msg: Message): void {
        super.onCloseRequest(msg);
        this.confirmed = false;
        this.accept();
    }

    get value(): boolean {
        return this.confirmed;
    }

    protected createMessageNode(msg: string | HTMLElement): HTMLElement {
        if (typeof msg === 'string') {
            const messageNode = this.node.ownerDocument.createElement('div');
            messageNode.textContent = msg;
            return messageNode;
        }
        return msg;
    }
}

export async function confirmExit(): Promise<boolean> {
    const safeToExit = await new ConfirmDialog({
        title: nls.localizeByDefault('Are you sure you want to quit?'),
        msg: nls.localize('theia/core/quitMessage', 'Any unsaved changes will not be saved.'),
        ok: Dialog.YES,
        cancel: Dialog.NO,
    }).open();
    return safeToExit === true;
}

export class ConfirmSaveDialogProps extends MessageDialogProps {
    readonly cancel: string;
    readonly dontSave: string;
    readonly save: string;
}

// Dialog prompting the user to confirm whether they wish to save changes or not
export class ConfirmSaveDialog extends AbstractDialog<boolean | undefined> {
    protected result?: boolean = false;

    constructor(
        @inject(ConfirmSaveDialogProps) protected override readonly props: ConfirmSaveDialogProps
    ) {
        super(props);
        // Append message and buttons to the dialog
        this.contentNode.appendChild(this.createMessageNode(this.props.msg));
        this.closeButton = this.appendButtonAndSetResult(props.cancel, false);
        this.appendButtonAndSetResult(props.dontSave, false, false);
        this.acceptButton = this.appendButtonAndSetResult(props.save, true, true);
    }

    get value(): boolean | undefined {
        return this.result;
    }

    protected createMessageNode(msg: string | HTMLElement): HTMLElement {
        if (typeof msg === 'string') {
            const messageNode = document.createElement('div');
            messageNode.textContent = msg;
            return messageNode;
        }
        return msg;
    }

    protected appendButtonAndSetResult(text: string, primary: boolean, result?: boolean): HTMLButtonElement {
        const button = this.appendButton(text, primary);
        button.addEventListener('click', () => {
            this.result = result;
            this.accept();
        });
        return button;
    }

}

@injectable()
export class SingleTextInputDialogProps extends DialogProps {
    readonly confirmButtonLabel?: string;
    readonly initialValue?: string;
    readonly placeholder?: string;
    readonly initialSelectionRange?: {
        start: number
        end: number
        direction?: 'forward' | 'backward' | 'none'
    };
    readonly validate?: (input: string, mode: DialogMode) => MaybePromise<DialogError>;
}

export class SingleTextInputDialog extends AbstractDialog<string> {

    protected readonly inputField: HTMLInputElement;

    constructor(
        @inject(SingleTextInputDialogProps) protected override props: SingleTextInputDialogProps
    ) {
        super(props);

        this.inputField = document.createElement('input');
        this.inputField.type = 'text';
        this.inputField.className = 'theia-input';
        this.inputField.spellcheck = false;
        this.inputField.setAttribute('style', 'flex: 0;');
        this.inputField.placeholder = props.placeholder || '';
        this.inputField.value = props.initialValue || '';
        if (props.initialSelectionRange) {
            this.inputField.setSelectionRange(
                props.initialSelectionRange.start,
                props.initialSelectionRange.end,
                props.initialSelectionRange.direction
            );
        } else {
            this.inputField.select();
        }

        this.contentNode.appendChild(this.inputField);
        this.controlPanel.removeChild(this.errorMessageNode);
        this.contentNode.appendChild(this.errorMessageNode);

        this.appendAcceptButton(props.confirmButtonLabel);
    }

    get value(): string {
        return this.inputField.value;
    }

    override getAutomationState(): DialogAutomationState {
        return { value: this.inputField.value };
    }

    protected override applyAutomationState(patch: DialogAutomationState): void {
        const unknownFields = Object.keys(patch).filter(key => key !== 'value');
        if (unknownFields.length) {
            throw this.automationError('InvalidDialogStateError', `Unknown dialog state field(s): ${unknownFields.join(', ')}`);
        }
        if (!Object.prototype.hasOwnProperty.call(patch, 'value')) {
            return;
        }
        if (typeof patch.value !== 'string') {
            throw this.automationError('InvalidDialogStateError', 'Dialog state field "value" must be a string.');
        }
        this.inputField.value = patch.value;
    }

    protected override isValid(value: string, mode: DialogMode): MaybePromise<DialogError> {
        if (this.props.validate) {
            return this.props.validate(value, mode);
        }
        return super.isValid(value, mode);
    }

    protected override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.addUpdateListener(this.inputField, 'input');
    }

    protected override onActivateRequest(msg: Message): void {
        this.inputField.focus();
    }

    protected override handleEnter(event: KeyboardEvent): boolean | void {
        if (event.target instanceof HTMLInputElement) {
            return super.handleEnter(event);
        }
        return false;
    }

}
