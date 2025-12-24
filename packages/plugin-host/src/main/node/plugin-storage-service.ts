// *****************************************************************************
// Plugin Storage Service - Mock Implementation
// TODO: Replace with real database implementation
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';

export const PluginStorageService = Symbol('PluginStorageService');

/**
 * Storage service for plugin settings
 */
export interface PluginStorageService {
    /**
     * Get value by key
     */
    get(key: string): Promise<string | undefined>;

    /**
     * Set value by key
     */
    set(key: string, value: string): Promise<void>;

    /**
     * Delete value by key
     */
    delete(key: string): Promise<void>;
}

/**
 * Mock implementation - stores data in memory
 * TODO: Replace with database implementation
 */
@injectable()
export class MockPluginStorageService implements PluginStorageService {
    private storage: Map<string, string> = new Map();

    async get(key: string): Promise<string | undefined> {
        return this.storage.get(key);
    }

    async set(key: string, value: string): Promise<void> {
        this.storage.set(key, value);
        console.log(`[MockPluginStorageService] Stored ${key}: ${value}`);
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
        console.log(`[MockPluginStorageService] Deleted ${key}`);
    }
}
