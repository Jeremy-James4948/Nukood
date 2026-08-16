import { config } from 'dotenv';
import { resolve } from 'path';
// Load environment variables for the Node.js script
config({ path: resolve(__dirname, '../../.env.local') });

import { CategoryService } from '../services/category.service';
import { TemplateService } from '../services/template.service';

async function syncGlobals() {
  console.log("Syncing global categories...");
  await CategoryService.syncGlobalCategories();
  
  console.log("Syncing global templates...");
  await TemplateService.syncGlobalTemplates();
  
  console.log("Done.");
}

syncGlobals().catch(console.error);
