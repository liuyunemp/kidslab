import { startEnglish } from './engine.js';
import { course, UI } from './content.js';
import { manifest } from './speech-manifest.js';
startEnglish(course, UI, manifest);
