"use strict";
// *****************************************************************************
// Copyright (C) 2026 and others.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.configure = void 0;
const Mocha = require("mocha");
let configuredOptions = {
    ui: 'tdd',
    color: true,
    timeout: 30000
};
let configuredFiles = [];
function configure(options, files) {
    configuredOptions = options;
    configuredFiles = files;
}
exports.configure = configure;
function run(_, callback) {
    const mocha = new Mocha(configuredOptions);
    configuredFiles.forEach(file => mocha.addFile(file));
    try {
        mocha.run(failures => {
            callback(failures > 0 ? new Error(`${failures} test(s) failed.`) : undefined);
        });
    }
    catch (error) {
        callback(error);
    }
}
exports.run = run;
