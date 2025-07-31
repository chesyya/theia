#!/usr/bin/env node

/*---------------------------------------------------------
 * Copyright (C) Theia Contributors. All rights reserved.
 *--------------------------------------------------------*/

import { main } from './cli/index.mjs';

main().catch((error) => {
  console.error('Theia Test CLI Error:', error);
  process.exit(1);
});