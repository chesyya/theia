/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    ignorePatterns: ["node_modules/*", "build/*", "**/*.spec.ts", ".eslintrc.js"],
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
        "plugin:eslint-plugin/recommended",
        'plugin:storybook/recommended'
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: {
            "jsx": true
        },
        tsconfigRootDir: __dirname, // override
        sourceType: "module",
        project: "./tsconfig.json"
    },
    plugins: ["import", "react", "@typescript-eslint", "jsdoc", "prettier", "filenames"],
    rules: {
        "camelcase": ["error", { "properties": "always" }],
        // 方法、类、函数加注释
        "jsdoc/require-jsdoc": ["error", {
            "require": {
                "FunctionDeclaration": true,
                "MethodDefinition": false,
                "ClassDeclaration": true,
                "ClassExpression": false,
                "FunctionExpression": false
            },
            "contexts": ["MethodDefinition:not([accessibility=\"private\"]) > FunctionExpression", "TSInterfaceDeclaration", "TSMethodSignature"],
        }],
        //所有的类成员必须显式的声明其访问修饰符
        "@typescript-eslint/explicit-member-accessibility": ["error", {
            "accessibility": "explicit",
            overrides: {
                accessors: 'explicit',
                constructors: 'no-public',
                methods: 'explicit',
                properties: 'off',
                parameterProperties: 'explicit'
            }
        }],
        // 每个函数都要有明确的返回类型声明
        '@typescript-eslint/explicit-function-return-type': 'error',
        // 代码文件命名kebab-case横线连接
        "filenames/match-regex": ["error", "^[a-z][a-z0-9]*(-[a-z0-9]+)*$", true],
        // 命名规则
        "@typescript-eslint/naming-convention": ["error",
            {
                // 类、接口命名使用帕斯卡命名法
                "selector": "class",
                "format": ["PascalCase"],
                "leadingUnderscore": "forbid",
                "trailingUnderscore": "forbid"
            },
            {
                // 类、接口命名使用帕斯卡命名法
                "selector": "interface",
                "format": ["PascalCase"],
                "leadingUnderscore": "forbid",
                "trailingUnderscore": "forbid"
            },
            {
                // 函数命名使用驼峰命名法
                "selector": "function",
                "format": ["camelCase"],
                "leadingUnderscore": "forbid",
                "trailingUnderscore": "forbid",
                "filter": {
                    "regex": "^[_a-z][_a-zA-Z0-9]*$",
                    "match": true
                }
            },
            {
                // 变量命名使用驼峰命名法
                "selector": "variable",
                "format": ["camelCase"],
                "leadingUnderscore": "forbid",
                "trailingUnderscore": "forbid"
            },
            {
                //常量用uppercase
                "selector": ["variable"],
                "modifiers": ["const", "exported"],
                "format": ["UPPER_CASE"]
            },
            {
                // 类成员变量命名使用驼峰命名法
                "selector": "memberLike",
                "modifiers": ["private", "protected", "public", "readonly"],
                "format": ["camelCase"],
                "leadingUnderscore": "forbid",
                "trailingUnderscore": "forbid"
            },
            {
                // 枚举命名使用PascalCase
                "selector": "enum",
                "format": ["PascalCase"],
                "leadingUnderscore": "forbid",
                "trailingUnderscore": "forbid"
            },
            {
                // 枚举成员使用全大写，单词间用下划线隔开
                "selector": "enumMember",
                "format": ["UPPER_CASE"],
                "leadingUnderscore": "forbid",
                "trailingUnderscore": "forbid"
            }
        ],
        // 程序中不要出现标识符完全相同的局部变量和全局变量
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": "error",
        //未使用的变量
        "@typescript-eslint/no-unused-vars": "off",
        //指定type
        "@typescript-eslint/no-explicit-any": "off",
        //describerInfo' is never reassigned. Use 'const' instead
        "prefer-const": "off",
        //禁止非空断言
        "@typescript-eslint/no-non-null-assertion": "off",
        //空方法
        "@typescript-eslint/no-empty-function": "off",
        //类型推断
        "@typescript-eslint/no-inferrable-types": "off",
        //Don't use `Boolean` as a type. Use boolean instead
        "@typescript-eslint/ban-types": "off",
        //Unnecessary semicolon
        "@typescript-eslint/no-extra-semi": "off",
        //Unexpected var, use let or const instead
        "no-var": "off",
        //Empty block statement
        "no-empty": "off",
        //ES2015 module syntax is preferred over namespaces
        "@typescript-eslint/no-namespace": "off",
        // 禁止使用"index"作为文件名
        "filenames/no-index": "off",
        //Promise executor functions should not be async
        "no-async-promise-executor": "off",
        //Expected a 'break' statement before 'case'
        "no-fallthrough": "off",
        // 'my-custom-rules/require-file-header': 'warn',
        "prettier/prettier": "off",
        // Require statement not part of import statement
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-empty-interface": "off",
        //Irregular whitespace not allowed
        "no-irregular-whitespace": "off",
        //Unexpected aliasing of 'this' to local variable
        "@typescript-eslint/no-this-alias": "off",
    },
    //module: "commonjs" // 将module选项设置为commonjs
};
