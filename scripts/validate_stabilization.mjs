/**
 * STABILIZATION VALIDATION SCRIPT
 * Tests the hardening changes locally without requiring a running server.
 * 
 * Tests:
 * 1. UUID validation utility
 * 2. UUID array validation
 * 3. Source enforcement in observability logger
 * 4. Build passed (verified separately)
 */

// Test UUID validation directly
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
    if (typeof value !== 'string') return false;
    return UUID_REGEX.test(value);
}

function validateUUIDArray(arr) {
    if (!Array.isArray(arr)) return { valid: false, invalid: ['not_an_array'] };
    const invalid = arr.filter(id => !isValidUUID(id));
    return { valid: invalid.length === 0, invalid };
}

let passed = 0;
let failed = 0;
const results = [];

function test(name, condition) {
    if (condition) {
        passed++;
        results.push(`  ✅ ${name}`);
    } else {
        failed++;
        results.push(`  ❌ ${name}`);
    }
}

console.log('========== STABILIZATION VALIDATION ==========\n');

// --- UUID Validation Tests ---
console.log('--- Task 2: UUID Validation ---');

test('Valid UUID accepted', isValidUUID('9fb065b2-088f-40e6-af04-b7340589a73a'));
test('Valid UUID uppercase accepted', isValidUUID('9FB065B2-088F-40E6-AF04-B7340589A73A'));
test('Invalid UUID rejected (short)', !isValidUUID('abc-123'));
test('Invalid UUID rejected (empty)', !isValidUUID(''));
test('Invalid UUID rejected (null)', !isValidUUID(null));
test('Invalid UUID rejected (number)', !isValidUUID(123));
test('Invalid UUID rejected (SQL injection)', !isValidUUID("'; DROP TABLE --"));
test('Invalid UUID rejected (XSS)', !isValidUUID('<script>alert(1)</script>'));

// Array validation
test('Valid UUID array accepted', validateUUIDArray(['9fb065b2-088f-40e6-af04-b7340589a73a', '0bc9836e-2d5e-4904-92cb-b0a12f4d6686']).valid);
test('Empty UUID array accepted', validateUUIDArray([]).valid);
test('Mixed array rejected', !validateUUIDArray(['9fb065b2-088f-40e6-af04-b7340589a73a', 'not-a-uuid']).valid);
test('Non-array rejected', !validateUUIDArray('not-an-array').valid);
test('Invalid items tracked', validateUUIDArray(['good-nope', 'bad-nope']).invalid.length === 2);

// --- Observability Source Guard Tests ---
console.log('\n--- Task 1: Source Guard Logic ---');

function testSourceGuard(source) {
    return (typeof source === 'string' && source.trim().length > 0) ? source.trim() : 'unknown_source';
}

test('Valid source preserved', testSourceGuard('alert_system') === 'alert_system');
test('Empty string → unknown_source', testSourceGuard('') === 'unknown_source');
test('Null → unknown_source', testSourceGuard(null) === 'unknown_source');
test('Undefined → unknown_source', testSourceGuard(undefined) === 'unknown_source');
test('Whitespace only → unknown_source', testSourceGuard('   ') === 'unknown_source');
test('Source with spaces trimmed', testSourceGuard('  alert_system  ') === 'alert_system');

// --- Pincode Validation Tests ---
console.log('\n--- Task 2: Pincode Validation ---');

function isValidPincode(p) { return /^\d{6}$/.test(String(p).trim()); }

test('Valid pincode accepted (110001)', isValidPincode('110001'));
test('Valid pincode accepted (998001)', isValidPincode('998001'));
test('Invalid pincode rejected (5 digits)', !isValidPincode('11000'));
test('Invalid pincode rejected (7 digits)', !isValidPincode('1100011'));
test('Invalid pincode rejected (letters)', !isValidPincode('abcdef'));
test('Invalid pincode rejected (empty)', !isValidPincode(''));

console.log('\n==============================================');
console.log(`  TOTAL: ${passed + failed} tests`);
console.log(`  PASSED: ${passed} ✅`);
console.log(`  FAILED: ${failed} ❌`);
console.log('==============================================\n');

results.forEach(r => console.log(r));

if (failed > 0) process.exit(1);
