// *****************************************************************************
// Copyright (C) 2025 and others.
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

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Container } from '@theia/core/shared/inversify';
import { VSXExtensionsWidget, VSXExtensionsWidgetOptions } from './vsx-extensions-widget';
import { VSXExtensionsSource, VSXExtensionsSourceOptions } from './vsx-extensions-source';
import { TreeNode, SelectableTreeNode, TreeModel } from '@theia/core/lib/browser';

describe('VSXExtensionsWidget', () => {

    let container: Container;
    let widget: VSXExtensionsWidget;
    let mockModel: sinon.SinonStubbedInstance<TreeModel>;

    beforeEach(() => {
        container = new Container();

        // Create mock model
        mockModel = {
            root: undefined,
            selectNode: sinon.stub()
        } as any;
    });

    afterEach(() => {
        sinon.restore();
        if (widget && !widget.isDisposed) {
            widget.dispose();
        }
    });

    describe('focusAndReveal', () => {
        it('should return false when model has no root', async () => {
            // Create widget with minimal setup
            const options: VSXExtensionsWidgetOptions = {
                id: VSXExtensionsSourceOptions.INSTALLED
            };

            widget = VSXExtensionsWidget.createWidget(container, options);
            (widget as any).model = mockModel;

            const result = await widget.focusAndReveal('test-plugin');

            expect(result).to.be.false;
        });

        it('should return false when plugin node not found', async () => {
            const rootNode: TreeNode = {
                id: 'root',
                parent: undefined,
                children: []
            } as any;

            mockModel.root = rootNode;

            const options: VSXExtensionsWidgetOptions = {
                id: VSXExtensionsSourceOptions.INSTALLED
            };

            widget = VSXExtensionsWidget.createWidget(container, options);
            (widget as any).model = mockModel;

            const result = await widget.focusAndReveal('non-existent-plugin');

            expect(result).to.be.false;
        });

        it('should return false when plugin node is not visible', async () => {
            const pluginNode: TreeNode & SelectableTreeNode = {
                id: 'test-plugin',
                parent: undefined,
                selected: false,
                visible: false
            } as any;

            const rootNode: TreeNode = {
                id: 'root',
                parent: undefined,
                children: [pluginNode]
            } as any;

            mockModel.root = rootNode;

            const options: VSXExtensionsWidgetOptions = {
                id: VSXExtensionsSourceOptions.INSTALLED
            };

            widget = VSXExtensionsWidget.createWidget(container, options);
            (widget as any).model = mockModel;

            const result = await widget.focusAndReveal('test-plugin');

            expect(result).to.be.false;
        });

        it('should select and return true when visible selectable plugin node found', async () => {
            const pluginNode: TreeNode & SelectableTreeNode = {
                id: 'test-plugin',
                parent: undefined,
                selected: false,
                visible: true
            } as any;

            const rootNode: TreeNode = {
                id: 'root',
                parent: undefined,
                children: [pluginNode]
            } as any;

            mockModel.root = rootNode;

            const options: VSXExtensionsWidgetOptions = {
                id: VSXExtensionsSourceOptions.INSTALLED
            };

            widget = VSXExtensionsWidget.createWidget(container, options);
            (widget as any).model = mockModel;

            // Mock the node element query
            const mockElement = {
                scrollIntoView: sinon.stub(),
                classList: {
                    add: sinon.stub(),
                    remove: sinon.stub()
                }
            };
            sinon.stub(widget.node, 'querySelector').returns(mockElement as any);

            const result = await widget.focusAndReveal('test-plugin');

            expect(result).to.be.true;
            expect(mockModel.selectNode.calledWith(pluginNode)).to.be.true;
            expect(mockElement.scrollIntoView.calledOnce).to.be.true;
            expect(mockElement.classList.add.calledWith('theia-vsx-extension-highlight')).to.be.true;
        });

        it('should find plugin node in nested tree structure', async () => {
            const pluginNode: TreeNode & SelectableTreeNode = {
                id: 'test-plugin',
                parent: undefined,
                selected: false,
                visible: true
            } as any;

            const parentNode: TreeNode = {
                id: 'parent',
                parent: undefined,
                children: [pluginNode]
            } as any;

            const rootNode: TreeNode = {
                id: 'root',
                parent: undefined,
                children: [parentNode]
            } as any;

            mockModel.root = rootNode;

            const options: VSXExtensionsWidgetOptions = {
                id: VSXExtensionsSourceOptions.INSTALLED
            };

            widget = VSXExtensionsWidget.createWidget(container, options);
            (widget as any).model = mockModel;

            // Mock the node element query
            const mockElement = {
                scrollIntoView: sinon.stub(),
                classList: {
                    add: sinon.stub(),
                    remove: sinon.stub()
                }
            };
            sinon.stub(widget.node, 'querySelector').returns(mockElement as any);

            const result = await widget.focusAndReveal('test-plugin');

            expect(result).to.be.true;
            expect(mockModel.selectNode.calledWith(pluginNode)).to.be.true;
        });

        it('should not select if node is not selectable', async () => {
            const pluginNode: TreeNode = {
                id: 'test-plugin',
                parent: undefined,
                visible: true
            } as any;

            const rootNode: TreeNode = {
                id: 'root',
                parent: undefined,
                children: [pluginNode]
            } as any;

            mockModel.root = rootNode;

            const options: VSXExtensionsWidgetOptions = {
                id: VSXExtensionsSourceOptions.INSTALLED
            };

            widget = VSXExtensionsWidget.createWidget(container, options);
            (widget as any).model = mockModel;

            // Mock the node element query
            const mockElement = {
                scrollIntoView: sinon.stub(),
                classList: {
                    add: sinon.stub(),
                    remove: sinon.stub()
                }
            };
            sinon.stub(widget.node, 'querySelector').returns(mockElement as any);

            const result = await widget.focusAndReveal('test-plugin');

            expect(result).to.be.true;
            expect(mockModel.selectNode.called).to.be.false;
            expect(mockElement.scrollIntoView.calledOnce).to.be.true;
        });

        it('should handle missing DOM element gracefully', async () => {
            const pluginNode: TreeNode & SelectableTreeNode = {
                id: 'test-plugin',
                parent: undefined,
                selected: false,
                visible: true
            } as any;

            const rootNode: TreeNode = {
                id: 'root',
                parent: undefined,
                children: [pluginNode]
            } as any;

            mockModel.root = rootNode;

            const options: VSXExtensionsWidgetOptions = {
                id: VSXExtensionsSourceOptions.INSTALLED
            };

            widget = VSXExtensionsWidget.createWidget(container, options);
            (widget as any).model = mockModel;

            // Mock querySelector to return null
            sinon.stub(widget.node, 'querySelector').returns(null);

            const result = await widget.focusAndReveal('test-plugin');

            // Should still return true as the node was found and selected
            expect(result).to.be.true;
            expect(mockModel.selectNode.calledWith(pluginNode)).to.be.true;
        });
    });
});
