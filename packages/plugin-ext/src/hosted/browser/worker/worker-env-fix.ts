// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
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

/**
 * CRITICAL: This file MUST be imported FIRST in worker-main.ts
 *
 * Problem:
 * When webpack includes crypto-browserify fallback:
 * 1. crypto-browserify is bundled and cached by webpack
 * 2. crypto-browserify checks `process.browser` to decide code path
 * 3. If `process.browser === true`, uses browser's crypto.getRandomValues()
 * 4. If not, tries to use Node.js APIs (randombytes) → FAILS in Worker
 *
 * Key Insight (from user):
 * We CANNOT intercept require('crypto') because the module is already
 * cached by webpack. Instead, we must ensure crypto-browserify takes
 * the browser code path by setting process.browser = true.
 *
 * Solution:
 * 1. Set process.browser = true → crypto-browserify uses browser path
 * 2. Ensure global 'crypto' points to self.crypto
 * 3. Provide minimal process polyfill for process.nextTick
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const globalSelf = self as any;

// 1. Provide process polyfill with browser: true
//    This makes crypto-browserify use native Web Crypto API
if (typeof globalSelf.process === 'undefined') {
    globalSelf.process = {
        browser: true,  // CRITICAL: This flag tells crypto-browserify to use browser APIs
        env: {},
        version: '111',
        versions: {},
        nextTick: (fn: Function, ...args: any[]) => {
            setTimeout(() => fn(...args), 0);
        }
    };
}

// 2. Ensure global 'crypto' exists and points to Worker's native crypto
//    crypto-browserify will use this when process.browser === true
if (typeof globalSelf.crypto === 'undefined' && typeof self.crypto !== 'undefined') {
    globalSelf.crypto = self.crypto;
}
