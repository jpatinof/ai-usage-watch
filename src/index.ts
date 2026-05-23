#!/usr/bin/env node

import { handleCliError, main } from './main.js';

main().catch(error => handleCliError(error));
