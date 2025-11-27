// *****************************************************************************
// Copyright (C) 2024 Baosky and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * API 兼容性检查的共享类型定义
 */

/**
 * 函数/方法签名
 */
export interface FunctionSignature {
    parameters: ParameterInfo[];
    returnType: string;
    typeParameters?: string[];
}

/**
 * 参数信息
 */
export interface ParameterInfo {
    name: string;
    type: string;
    optional: boolean;
    defaultValue?: string;
}

/**
 * 属性信息
 */
export interface PropertyInfo {
    name: string;
    type: string;
    readonly: boolean;
    optional: boolean;
}

/**
 * API 定义（用于 IDE 声明）
 */
export interface ApiDefinition {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'enum' | 'namespace' | 'type' | 'variable';
    signature?: FunctionSignature;
    properties?: Record<string, PropertyInfo>;
    methods?: Record<string, FunctionSignature[]>; // 支持重载
    constructors?: FunctionSignature[];
    enumValues?: string[];
    typeAlias?: string;
    namespace?: Record<string, ApiDefinition>;
}

/**
 * IDE API 声明
 */
export interface IdeApiDeclaration {
    version: string;
    generatedAt: string;
    apis: Record<string, ApiDefinition>;
}

/**
 * 插件 API 使用记录
 */
export interface PluginApiUsage {
    pluginId: string;
    pluginVersion: string;
    usedApis: UsedApiInfo[];
    generatedAt: string;
}

/**
 * 使用的 API 信息
 */
export interface UsedApiInfo {
    apiName: string;
    /** 使用的方式 */
    usageType: 'call' | 'construct' | 'property' | 'type';
    /** 访问的成员路径，如 ['commands', 'registerCommand'] */
    memberPath?: string[];
    /** 如果是函数调用，记录参数数量 */
    parameterCount?: number;
    /** 使用位置（用于错误报告） */
    locations: Array<{
        file: string;
        line: number;
    }>;
}

/**
 * 兼容性检查结果
 */
export interface CompatibilityResult {
    compatible: boolean;
    issues: CompatibilityIssue[];
    summary: {
        totalApis: number;
        compatibleApis: number;
        incompatibleApis: number;
        missingApis: number;
    };
}

/**
 * 兼容性问题
 */
export interface CompatibilityIssue {
    severity: 'error' | 'warning' | 'info';
    apiName: string;
    memberPath?: string[];
    issue: string;
    pluginUsage?: UsedApiInfo;
    ideDefinition?: ApiDefinition;
}
