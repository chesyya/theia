# Menu Path Mapping 重构指南

## 目标

将 `vscode-theia-menu-mappings.ts` 中硬编码的业务模块菜单路径依赖，改为通过 `PluginDataContribution` 机制动态获取，实现解耦。

## 重构前后对比

### 重构前

```typescript
// plugin-host 直接依赖业务包
import { USER_MANUAL_MENU } from '@baosky/platform/lib/browser/go-to-help-service/usermanual-general-function-command'

const codeToTheiaMappings = new Map([
  ['menubar/help/document', [USER_MANUAL_MENU]]
]);
```

### 重构后

```typescript
// 业务包提供数据
@injectable()
export class GoToHelpMenuPathContribution implements PluginDataContribution {
  provideData(): PluginDataItem[] {
    return [{
      key: 'plugin.menu.mappings.menubar/help/document',
      value: [USER_MANUAL_MENU]
    }];
  }
}

// plugin-host 通过 registry 动态获取
const menuPaths = await menuMappingRegistry.getMenuPaths('menubar/help/document');
```

## 实施步骤

### 步骤 1: 在业务包中创建 Menu Path Contribution

#### 1.1 对于 Platform 包中的菜单（如帮助文档）

创建文件：`packages/platform/src/browser/go-to-help-service/menu-path-contribution.ts`

```typescript
import { injectable } from '@theia/core/shared/inversify';
import { PluginDataContribution, PluginDataItem } from '../plugin-data';
import { USER_MANUAL_MENU } from './usermanual-general-function-command';

@injectable()
export class GoToHelpMenuPathContribution implements PluginDataContribution {
  provideData(): PluginDataItem[] {
    return [
      {
        key: 'plugin.menu.mappings.menubar/help/document',
        value: [USER_MANUAL_MENU],
        description: '帮助文档菜单路径映射'
      }
    ];
  }
}
```

在 `bind.ts` 中绑定：

```typescript
import { GoToHelpMenuPathContribution } from './menu-path-contribution';
import { PluginDataContribution } from '../plugin-data';

export function bindGoToHelp(bind: interfaces.Bind): void {
  // ... 现有绑定

  bind(GoToHelpMenuPathContribution).toSelf().inSingletonScope();
  bind(PluginDataContribution).toService(GoToHelpMenuPathContribution);
}
```

#### 1.2 对于项目树相关菜单

如果项目树菜单在单独的包中（如 `packages/project`），创建类似的 contribution：

创建文件：`packages/project/src/browser/plugin-menu-contribution.ts`

```typescript
import { injectable } from '@theia/core/shared/inversify';
import { PluginDataContribution, PluginDataItem } from '@baosky/platform/lib/browser/plugin-data';

@injectable()
export class ProjectTreeMenuPathContribution implements PluginDataContribution {
  provideData(): PluginDataItem[] {
    return [
      // ===== VSCode Contribution Point 映射 =====

      // PU (Program Unit) 相关
      {
        key: 'plugin.menu.mappings.tree/pu/element',
        value: [['programUnit-context-menu']],
        description: 'PU 元素右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/pu/folder',
        value: [['program-unit-subfolder']],
        description: 'PU 文件夹右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/pu/category',
        value: [['program-unit-folder']],
        description: 'PU 分类右键菜单'
      },
      {
        key: 'plugin.menu.mappings.pu/head/context',
        value: [['text-table-menu']],
        description: 'PU 表头右键菜单'
      },
      {
        key: 'plugin.menu.mappings.pu/headCell/context',
        value: [['text-table-cell-menu']],
        description: 'PU 表头单元格右键菜单'
      },
      {
        key: 'plugin.menu.mappings.pu/bodyST/context',
        value: [['editor_context_menu']],
        description: 'PU ST 编辑器右键菜单'
      },
      {
        key: 'plugin.menu.mappings.pu/bodyLD/context',
        value: [['diagram-context-menu', 'ladder-diagram']],
        description: 'PU LD 编辑器右键菜单'
      },

      // GVS 相关
      {
        key: 'plugin.menu.mappings.tree/gvs/element',
        value: [['GVS-context-menu']],
        description: 'GVS 元素右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/gvs/folder',
        value: [['gvs-subfolder']],
        description: 'GVS 文件夹右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/gvs/category',
        value: [['gvs-folder']],
        description: 'GVS 分类右键菜单'
      },

      // IO Mapping 相关
      {
        key: 'plugin.menu.mappings.tree/iomapping/element',
        value: [['io-mapping-context-menu']],
        description: 'IO Mapping 元素右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/iomapping/folder',
        value: [['io-mapping-subfolder']],
        description: 'IO Mapping 文件夹右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/iomapping/category',
        value: [['io-mapping-folder-context-menu']],
        description: 'IO Mapping 分类右键菜单'
      },
      {
        key: 'plugin.menu.mappings.io-mapping/head/context',
        value: [['io-mapping-row-context-menu']],
        description: 'IO Mapping 行右键菜单'
      },

      // UDT 相关
      {
        key: 'plugin.menu.mappings.tree/udt/element',
        value: [['UDT-context-menu']],
        description: 'UDT 元素右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/udt/folder',
        value: [['UDT-subfolder']],
        description: 'UDT 文件夹右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/udt/category',
        value: [['UDT-folder']],
        description: 'UDT 分类右键菜单'
      },

      // Task 相关
      {
        key: 'plugin.menu.mappings.tree/task/element',
        value: [['task-context-menu']],
        description: 'Task 元素右键菜单'
      },
      {
        key: 'plugin.menu.mappings.tree/task/category',
        value: [['task-folder-context-menu']],
        description: 'Task 分类右键菜单'
      },

      // PLC 相关
      {
        key: 'plugin.menu.mappings.tree/plc/category',
        value: [['test-context-menu']],
        description: 'PLC 分类右键菜单'
      },

      // Software
      {
        key: 'plugin.menu.mappings.tree/software/category',
        value: [['software']],
        description: 'Software 分类右键菜单'
      },

      // ===== MenuPath 到 Name 的映射 =====

      {
        key: 'plugin.menu.pathnames.test-context-menu',
        value: 'plc',
        description: 'PLC 菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.software',
        value: 'software',
        description: 'Software 菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.gvs-folder',
        value: 'gvs_folder',
        description: 'GVS 文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.gvs-subfolder',
        value: 'gvs_subfolder',
        description: 'GVS 子文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.GVS-context-menu',
        value: 'gvs',
        description: 'GVS 菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.program-unit-folder',
        value: 'pu_folder',
        description: 'PU 文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.programUnit-context-menu',
        value: 'pu',
        description: 'PU 菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.program-unit-subfolder',
        value: 'pu_subfolder',
        description: 'PU 子文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.task-folder-context-menu',
        value: 'task_folder',
        description: 'Task 文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.task-context-menu',
        value: 'task',
        description: 'Task 菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.UDT-folder',
        value: 'udt_folder',
        description: 'UDT 文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.UDT-subfolder',
        value: 'udt_subfolder',
        description: 'UDT 子文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.UDT-context-menu',
        value: 'udt',
        description: 'UDT 菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.io-mapping-folder-context-menu',
        value: 'iomapping_folder',
        description: 'IO Mapping 文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.io-mapping-subfolder',
        value: 'iomapping_subfolder',
        description: 'IO Mapping 子文件夹菜单路径名称'
      },
      {
        key: 'plugin.menu.pathnames.io-mapping-context-menu',
        value: 'iomapping',
        description: 'IO Mapping 菜单路径名称'
      }
    ];
  }
}
```

在项目的 frontend-module 中绑定：

```typescript
import { ProjectTreeMenuPathContribution } from './plugin-menu-contribution';
import { PluginDataContribution } from '@baosky/platform/lib/browser/plugin-data';

export default new ContainerModule(bind => {
  // ... 其他绑定

  bind(ProjectTreeMenuPathContribution).toSelf().inSingletonScope();
  bind(PluginDataContribution).toService(ProjectTreeMenuPathContribution);
});
```

### 步骤 2: 在 plugin-host 中使用 MenuMappingRegistry

#### 2.1 在 plugin-host 的 frontend-module 中绑定服务

创建或修改：`extensions/plugin-host/src/main/browser/plugin-frontend-module.ts`

```typescript
import { MenuMappingRegistry } from './menus/menu-mapping-registry';

export default new ContainerModule(bind => {
  // ... 其他绑定

  // 绑定菜单映射注册中心
  bind(MenuMappingRegistry).toSelf().inSingletonScope();
});
```

#### 2.2 在需要使用映射的地方注入服务

例如在菜单贡献处理器中：

```typescript
import { MenuMappingRegistry } from './menus/menu-mapping-registry';

@injectable()
export class MenusContributionHandler {
  @inject(MenuMappingRegistry)
  protected readonly menuMappingRegistry: MenuMappingRegistry;

  async registerMenus(contributionPoint: ContributionPoint): Promise<void> {
    // 获取映射的菜单路径
    const menuPaths = this.menuMappingRegistry.getMenuPaths(contributionPoint);

    if (menuPaths) {
      // 注册菜单
      for (const menuPath of menuPaths) {
        // ... 注册逻辑
      }
    }
  }

  getMenuPathName(menuPath: string): string | undefined {
    return this.menuMappingRegistry.getMenuPathName(menuPath);
  }
}
```

### 步骤 3: 更新现有代码

#### 3.1 移除硬编码的导入

在 `vscode-theia-menu-mappings.ts` 中：

```typescript
// 删除这一行
// import { USER_MANUAL_MENU } from '@baosky/platform/lib/browser/go-to-help-service/usermanual-general-function-command'
```

#### 3.2 将静态映射改为使用 MenuMappingRegistry

如果其他地方使用了 `codeToTheiaMappings`，改为注入 `MenuMappingRegistry`：

```typescript
// 之前
const menuPaths = codeToTheiaMappings.get('tree/pu/element');

// 之后
const menuPaths = this.menuMappingRegistry.getMenuPaths('tree/pu/element');
```

## Key 命名规范

为了避免冲突，建议使用以下命名规范：

### VSCode Contribution Point 映射

```
plugin.menu.mappings.<contribution-point>
```

示例：
- `plugin.menu.mappings.tree/pu/element`
- `plugin.menu.mappings.menubar/help/document`
- `plugin.menu.mappings.pu/head/context`

### MenuPath 名称映射

```
plugin.menu.pathnames.<menu-path>
```

示例：
- `plugin.menu.pathnames.programUnit-context-menu`
- `plugin.menu.pathnames.gvs-folder`
- `plugin.menu.pathnames.io-mapping-context-menu`

## 优势

1. **解耦**：plugin-host 不再直接依赖业务包的具体实现
2. **灵活**：业务包可以独立演化，只需保持 key 不变
3. **可扩展**：新增业务包只需实现 contribution 即可
4. **可维护**：映射逻辑集中在各自的业务包中
5. **可测试**：可以轻松 mock PluginDataRegistry 进行测试

## 迁移检查清单

- [ ] 在 platform 包中创建 GoToHelpMenuPathContribution
- [ ] 在 project 包中创建 ProjectTreeMenuPathContribution
- [ ] 在各业务包的 frontend-module 中绑定 contribution
- [ ] 在 plugin-host 中绑定 MenuMappingRegistry
- [ ] 更新使用 codeToTheiaMappings 的代码
- [ ] 删除 vscode-theia-menu-mappings.ts 中的业务包导入
- [ ] 运行测试确保功能正常
- [ ] 验证插件菜单注册功能正常工作

## 注意事项

1. **初始化时机**：`MenuMappingRegistry` 使用 `@postConstruct` 确保在服务可用前完成初始化
2. **Key 唯一性**：确保不同业务包提供的 key 不冲突
3. **向后兼容**：内置映射仍然保留在 `MenuMappingRegistry` 中，确保核心功能不受影响
4. **错误处理**：如果某个业务包未提供预期的映射，应有合理的降级策略
