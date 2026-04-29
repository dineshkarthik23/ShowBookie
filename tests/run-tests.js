import { runBookingTests } from './booking.test.js';
import { runValidationTests } from './validation.test.js';

const suites = [
  ['booking logic', runBookingTests],
  ['validation logic', runValidationTests],
];

let passed = 0;

for (const [name, suite] of suites) {
  try {
    suite();
    console.log(`PASS ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exit(1);
  }
}

console.log(`All ${passed} test suite(s) passed.`);
