module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: "jsdom",
    extensionsToTreatAsEsm: ['.ts'],
    verbose: true,
    collectCoverage: true,
    coverageDirectory: "../jsunit-reports",
    coverageReporters: ['clover', 'lcov'],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: 'jsunit-reports',
                outputName: 'report.xml'
            }
        ],
        ["jest-html-reporters",
            {
                publicPath: "jsunit-reports/Unit-report",
                filename: "index.html"
            }
        ],
        [
            "jest-sonar",
            {
                outputDirectory: "jsunit-reports",
                outputName: "test-reporter.xml",
                reportedFilePath: 'absolute'
            }
        ]
    ],
    testMatch: ['**/*.spec.ts'],
    rootDir: './src/',
    transform: {
        '^.+\\.(ts|js)$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    transformIgnorePatterns: [
    '/node_modules/(?!(@theia|@baosky|msgpackr|vscode-languageserver-types|vscode-languageserver-protocol)/)'
    ],
    moduleNameMapper: {
        '\\.(css|less)$': 'identity-obj-proxy',
    }
};

