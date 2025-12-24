// *****************************************************************************
// Copyright (C) 2020 TypeFox and others.
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

import * as React from '@theia/core/shared/react';
import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import { ReactWidget, Message, codicon } from '@theia/core/lib/browser/widgets';
import { PreferenceService } from '@theia/core/lib/browser';
import { BSXExtensionsSearchModel } from './bsx-extensions-search-model';
import { BSXExtensionsModelImpl } from './bsx-extensions-model';
import { bnls } from '@baosky/platform/lib/common/bnls'
import { CommandService } from '@theia/core';
import { BSXExtensionsCommands } from './bsx-extension-commands';
import { RenderCommonInput } from '@baosky/platform/lib/browser/common-components/Input/input-component'
import _ from "lodash";

const searchPlaceholder = bnls.localizeByDefault('在天行插件商店搜索');

@injectable()
export class    BSXExtensionsSearchBar extends ReactWidget {

    @inject(BSXExtensionsModelImpl)
    protected readonly extensionsModel: BSXExtensionsModelImpl;

    @inject(BSXExtensionsSearchModel)
    protected readonly searchModel: BSXExtensionsSearchModel;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    protected input: HTMLInputElement | undefined;
    protected onlyShowVerifiedExtensions: boolean | undefined;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    protected filterMenuVisible = false;
    protected filterButtonRef: HTMLSpanElement | null = null;

    protected isComposing = false;
    protected searchTerm: string = "";

    @postConstruct()
    protected init(): void {
        this.onlyShowVerifiedExtensions = this.preferenceService.get('extensions.onlyShowVerifiedExtensions');
        this.id = 'vsx-extensions-search-bar';
        this.addClass('theia-vsx-extensions-search-bar');
        this.searchModel.onDidChangeQuery((query: string) => this.updateSearchTerm(query));
        this.preferenceService.onPreferenceChanged(change => {
            if (change.preferenceName === 'extensions.onlyShowVerifiedExtensions') {
                this.extensionsModel.setOnlyShowVerifiedExtensions(!!change.newValue);
                this.onlyShowVerifiedExtensions = change.newValue;
                this.update();
            }
        });
        document.addEventListener('mousedown', this.handleDocumentClick, true);
        this.scrollOptions = {
        suppressScrollX: true,  // 禁止横向滚动
        suppressScrollY: true   // 禁止纵向滚动
        };
    }

    protected search = _.debounce(async (value: string) => {
        this.searchModel.query = value;
    }, 200);

    // protected render(): React.ReactNode {
    //     return <div className='vsx-search-container' style={{ position: 'relative' }}>
    //         <input
    //             type='text'
    //             ref={input => this.input = input || undefined}
    //             // defaultValue={this.searchModel.query}
    //             value={this.searchModel.query}
    //             onInput={(e)=>{
    //                 this.searchModel.query = (e.target as HTMLInputElement).value;
    //                 this.update();
    //             }}
    //             spellCheck={false}
    //             autoComplete="false"
    //             onChange={this.updateQuery}
    //             className='theia-input'
    //             placeholder={bnls.localizeByDefault('在天行插件商店搜索')}
    //             onCompositionStartCapture={this.handleComposition}
    //             onCompositionEndCapture={this.handleComposition}>
    //         </input>
    //         {this.searchModel.query && this.searchModel.query.trim() !== '' && this.renderOptionContainer()}
    //     </div>;
    // }

    protected render(): JSX.Element {
        return (
            <div style={{height: "24px", width: "100%"}}>
                <RenderCommonInput
                    className=".bsx-search-container"
                    type="text"
                    placeholder={searchPlaceholder}
                    onChange={(e): void => {
                        this.searchTerm = e.target.value !== undefined ? e.target.value : "";
                        this.search(this.searchTerm);
                    }}
                    onClear={() => this.searchModel.query = ''}
                    enableClearButton={true}
                    style={{width: '100%', paddingLeft: '8px'}}
                />
            </div>
        );
    }


     handleComposition = async (evt): Promise<void> => {
        console.dir(evt.type);
        if (evt.type === 'compositionend') {
            this.searchModel.query = evt.currentTarget.value;
          this.isComposing = false;
          return;
        }

        this.isComposing = true;
    }

    protected updateQuery = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        e.preventDefault();
    }

    protected updateSearchTerm(term: string): void {
        if (this.input) {
            this.input.value = term;
        }
    }

    protected renderOptionContainer(): React.ReactNode {
        const renderShowClearSerach = this.renderShowClearSerach();
        // const filterButton = (
        //     <span
        //         ref={ref => this.filterButtonRef = ref}
        //         className={`${codicon('filter')} option action-label`}
        //         title='Filter Extensions'
        //         onClick={e => {
        //             e.stopPropagation();
        //             this.filterMenuVisible = !this.filterMenuVisible;
        //             this.update();
        //         }}
        //     />
        // );
        return <div className='option-buttons'>
            {renderShowClearSerach}
            {/* {filterButton} */}
            {/* {this.filterMenuVisible && this.renderFilterMenu()} */}
        </div>;
    }

    // protected renderFilterMenu(): any {
    //     const rect = this.filterButtonRef?.getBoundingClientRect();
    //     const style: React.CSSProperties = rect ? {
    //         position: 'fixed',
    //         top: rect.bottom + 4,
    //         left: rect.left,
    //         zIndex: 10000,
    //         background: '#fff',
    //         border: '1px solid #ccc',
    //         padding: 0,
    //         minWidth: 220,
    //         boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    //         borderRadius: 6
    //     } : {};
    //     // 菜单数据
    //     const categories = [
    //         'Themes', 'Programming Languages', 'Linters', 'Snippets', 'Formatters', 'Keymaps', 'SCM Providers', 'Debuggers', 'Other'
    //     ];
    //     const sortOptions = [
    //         { label: 'Relevance', value: 'relevance' },
    //         { label: 'Most Popular', value: 'downloadCount' },
    //         { label: 'Recently Updated', value: 'updateDate' },
    //         { label: 'Highest Rated', value: 'rating' }
    //     ];
    //     // 菜单结构
    //     const menu = (
    //         <div className='vsx-filter-menu' style={style}>
    //             <div style={{ padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid #eee' }}>Filters</div>
    //             <div style={{ padding: '8px 12px', fontWeight: 500 }}>Category</div>
    //             {categories.map(cat => (
    //                 <div key={cat} className='vsx-filter-menu-item' style={{ padding: '4px 20px', cursor: 'pointer' }} onClick={() => this.insertFilterTag(`@category:${cat}`)}>{cat}</div>
    //             ))}
    //             <div style={{ padding: '8px 12px 0 12px', fontWeight: 500 }}>Sort By</div>
    //             {sortOptions.map(opt => (
    //                 <div key={opt.value} className='vsx-filter-menu-item' style={{ padding: '4px 20px', cursor: 'pointer' }} onClick={() => this.insertFilterTag(`@sort:${opt.value}`)}>{opt.label}</div>
    //             ))}
    //             <div style={{ padding: '8px 12px 0 12px', fontWeight: 500 }}>Quick</div>
    //             <div className='vsx-filter-menu-item' style={{ padding: '4px 20px', cursor: 'pointer' }} onClick={() => this.insertFilterTag('@popular')}>Most Popular</div>
    //             <div className='vsx-filter-menu-item' style={{ padding: '4px 20px', cursor: 'pointer' }} onClick={() => this.insertFilterTag('@recommended')}>Recommended</div>
    //             <div className='vsx-filter-menu-item' style={{ padding: '4px 20px', cursor: 'pointer' }} onClick={() => this.insertFilterTag('@installed')}>Installed</div>
    //         </div>
    //     );
    //     return ReactDOM.createPortal(menu, document.body);
    // }

    protected insertFilterTag(tag: string): void {
        if (this.input) {
            let value = this.input.value.trim();
            if (value && !value.endsWith(' ')) value += ' ';
            if (!value.includes(tag)) {
                this.input.value = value + tag + ' ';
                this.searchModel.query = this.input.value;
            }
        }
        this.filterMenuVisible = false;
        this.update();
    }

    protected handleDocumentClick = (event: MouseEvent) => {
        if (this.filterMenuVisible) {
            const menu = document.querySelector('.vsx-filter-menu');
            if (menu && !menu.contains(event.target as Node) && this.filterButtonRef && !this.filterButtonRef.contains(event.target as Node)) {
                this.filterMenuVisible = false;
                this.update();
            }
        }
    };

protected renderShowClearSerach(): React.ReactNode {
        return <span
            className={`${codicon('clear')} option action-label ${this.searchModel.query ? 'enabled' : ''}`}
            title={bnls.localizeByDefault('清除搜索')}
            onClick={() => this.commandService.executeCommand(BSXExtensionsCommands.CLEAR_ALL.id)}>
        </span>;
    }

    protected renderShowVerifiedExtensions(): React.ReactNode {
        return <span
            className={`${codicon('verified')} option action-label ${this.onlyShowVerifiedExtensions ? 'enabled' : ''}`}
            title={bnls.localizeByDefault('仅显示已验证的插件。')}
            onClick={() => this.handleShowVerifiedExtensionsClick()}>
        </span>;
    }

    protected handleShowVerifiedExtensionsClick(): void {
        this.extensionsModel.setOnlyShowVerifiedExtensions(!this.onlyShowVerifiedExtensions);
        this.update();
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        if (this.input) {
            this.input.focus();
        }
    }

    protected override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.update();
    }

    override dispose(): void {
        document.removeEventListener('mousedown', this.handleDocumentClick, true);
        super.dispose();
    }

}
