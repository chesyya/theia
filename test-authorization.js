// Simple test to verify authorization system structure
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Authorization System Structure...');

// Check if all authorization files exist
const authFiles = [
    'packages/plugin-ext/src/common/authorization/types.ts',
    'packages/plugin-ext/src/common/authorization/i-authorization-service.ts', 
    'packages/plugin-ext/src/common/authorization/plugin-authorization-manager.ts',
    'packages/plugin-ext/src/common/authorization/plugin-authorization-service.ts',
    'packages/plugin-ext/src/main/browser/authorization/authorization-frontend-proxy.ts',
    'packages/plugin-ext/src/main/browser/authorization/plugin-authorization-service-proxy.ts',
    'packages/plugin-ext/src/main/node/authorization/authorization-rpc-server.ts',
    'packages/plugin-ext/src/main/node/authorization/authorization-service-backend-impl.ts',
];

let allFilesExist = true;
authFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        console.log('✅', file);
    } else {
        console.log('❌', file);
        allFilesExist = false;
    }
});

// Check if frontend module is properly configured
const frontendModulePath = path.join(__dirname, 'packages/plugin-ext/src/main/browser/plugin-ext-frontend-module.ts');
const frontendContent = fs.readFileSync(frontendModulePath, 'utf8');

const hasAuthImports = frontendContent.includes('AuthorizationFrontendProxy') && 
                      frontendContent.includes('PluginAuthorizationStatus');
const hasAuthBindings = frontendContent.includes('bind(AuthorizationFrontendProxy)') &&
                       frontendContent.includes('bind(IAuthorizationService)');

console.log('\n📋 Frontend Module Configuration:');
console.log(hasAuthImports ? '✅ Authorization imports present' : '❌ Missing authorization imports');
console.log(hasAuthBindings ? '✅ Authorization bindings present' : '❌ Missing authorization bindings');

// Check if backend module is properly configured  
const backendModulePath = path.join(__dirname, 'packages/plugin-ext/src/main/node/plugin-ext-backend-module.ts');
const backendContent = fs.readFileSync(backendModulePath, 'utf8');

const hasBackendBindings = backendContent.includes('bind(PluginAuthorizationManager)') &&
                          backendContent.includes('bind(AuthorizationRpcServer)');

console.log(hasBackendBindings ? '✅ Backend authorization bindings present' : '❌ Missing backend authorization bindings');

// Check plugin contribution handler integration
const contribHandlerPath = path.join(__dirname, 'packages/plugin-ext/src/main/browser/plugin-contribution-handler.ts');
const contribContent = fs.readFileSync(contribHandlerPath, 'utf8');

const hasAuthIntegration = contribContent.includes('@inject(IAuthorizationService)') &&
                          contribContent.includes('getAuthorizationStatus');

console.log(hasAuthIntegration ? '✅ Plugin contribution handler has authorization integration' : '❌ Missing authorization integration in contribution handler');

console.log('\n🎯 Summary:');
if (allFilesExist && hasAuthImports && hasAuthBindings && hasBackendBindings && hasAuthIntegration) {
    console.log('✅ Authorization system structure is complete!');
    process.exit(0);
} else {
    console.log('❌ Authorization system has missing components.');
    process.exit(1);
}