/**
 * run_postman_collection.js
 * 
 * Programmatic Postman Collection Runner for CostumeCloset Theatre.
 * Parses CostumeCloset_Postman_Collection.json, executes every request in order,
 * evaluates all embedded test assertions, and produces an execution report.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { app, server } = require('./index');

function makeRequest(method, urlPath, body) {
    return new Promise((resolve) => {
        const req = new http.IncomingMessage();
        req.method = method;
        req.url = urlPath;
        req.headers = { 'content-type': 'application/json' };
        
        let statusCode = 200;
        let responseBody = null;

        const res = {
            status: function (code) { statusCode = code; return this; },
            json: function (data) { responseBody = data; resolve({ status: statusCode, body: responseBody }); },
            setHeader: function () {},
            getHeader: function () {}
        };

        if (body) {
            req.body = body;
        }

        app.handle(req, res);
    });
}

// Flatten collection requests
function extractRequests(items, folder = '') {
    let requests = [];
    for (const item of items) {
        if (item.item) {
            const currentFolder = folder ? `${folder} / ${item.name}` : item.name;
            requests = requests.concat(extractRequests(item.item, currentFolder));
        } else if (item.request) {
            requests.push({
                folder,
                name: item.name,
                method: item.request.method,
                url: item.request.url.raw || item.request.url,
                body: item.request.body && item.request.body.raw ? JSON.parse(item.request.body.raw) : null,
                tests: item.event && item.event[0] && item.event[0].script ? item.event[0].script.exec : []
            });
        }
    }
    return requests;
}

async function runCollection() {
    const collectionPath = path.join(__dirname, 'CostumeCloset_Postman_Collection.json');
    const collectionData = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
    const requests = extractRequests(collectionData.item);

    const collectionVariables = {};
    if (collectionData.variable) {
        collectionData.variable.forEach(v => {
            collectionVariables[v.key] = v.value;
        });
    }

    console.log('======================================================================');
    console.log(`🚀 POSTMAN COLLECTION TEST RUNNER: ${collectionData.info.name}`);
    console.log('======================================================================\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const reportLines = [];

    reportLines.push(`POSTMAN COLLECTION EXECUTION REPORT`);
    reportLines.push(`Collection: ${collectionData.info.name}`);
    reportLines.push(`Timestamp: ${new Date().toISOString()}`);
    reportLines.push(`Total Requests: ${requests.length}`);
    reportLines.push('----------------------------------------------------------------------\n');

    // Pre-test reset: ensure Costume 15 is free and test records are clean
    await makeRequest('POST', '/hires/return', { costume_id: 15 });
    const db = require('./database');
    await new Promise(r => db.run("DELETE FROM actors WHERE email LIKE 'laurence%'", r));
    await new Promise(r => db.run("DELETE FROM costumes WHERE name LIKE 'Robin Hood Archer Tunic%'", r));

    for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        
        // Resolve collection variables in URL
        let resolvedUrl = req.url;
        for (const [key, val] of Object.entries(collectionVariables)) {
            resolvedUrl = resolvedUrl.split(`{{${key}}}`).join(val);
        }
        const relativeUrl = resolvedUrl.replace('http://localhost:3000', '');

        const startTime = Date.now();
        const res = await makeRequest(req.method, relativeUrl, req.body);
        const duration = Date.now() - startTime;

        const logHeader = `[#${i + 1}] ${req.folder} > ${req.name}`;
        console.log(`${logHeader}`);
        console.log(`    ↳ ${req.method} ${relativeUrl} -> HTTP ${res.status} (${duration}ms)`);

        reportLines.push(`${logHeader}`);
        reportLines.push(`  Request: ${req.method} ${relativeUrl}`);
        reportLines.push(`  Response Status: HTTP ${res.status}`);
        reportLines.push(`  Response Body: ${JSON.stringify(res.body)}`);

        // Mock Postman execution sandbox
        const pm = {
            collectionVariables: {
                set: function (key, val) {
                    collectionVariables[key] = String(val);
                },
                get: function (key) {
                    return collectionVariables[key];
                }
            },
            response: {
                code: res.status,
                to: {
                    have: {
                        status: function (expected) {
                            totalTests++;
                            if (res.status === expected) {
                                passedTests++;
                                console.log(`      ✅ PASS: Status code is ${expected}`);
                                reportLines.push(`    PASS: Status code is ${expected}`);
                            } else {
                                failedTests++;
                                console.log(`      ❌ FAIL: Expected status ${expected}, got ${res.status}`);
                                reportLines.push(`    FAIL: Expected status ${expected}, got ${res.status}`);
                            }
                        }
                    }
                },
                json: function () {
                    return res.body;
                }
            },
            expect: function (actual) {
                return {
                    to: {
                        eql: function (expected) {
                            totalTests++;
                            if (actual === expected) {
                                passedTests++;
                                console.log(`      ✅ PASS: Value matches expected "${expected}"`);
                                reportLines.push(`    PASS: Value matches expected "${expected}"`);
                            } else {
                                failedTests++;
                                console.log(`      ❌ FAIL: Expected "${expected}", got "${actual}"`);
                                reportLines.push(`    FAIL: Expected "${expected}", got "${actual}"`);
                            }
                        },
                        include: function (item) {
                            totalTests++;
                            const matches = Array.isArray(actual) ? actual.includes(item) : String(actual).includes(item);
                            if (matches) {
                                passedTests++;
                                console.log(`      ✅ PASS: Includes "${item}"`);
                                reportLines.push(`    PASS: Includes "${item}"`);
                            } else {
                                failedTests++;
                                console.log(`      ❌ FAIL: "${actual}" does not include "${item}"`);
                                reportLines.push(`    FAIL: "${actual}" does not include "${item}"`);
                            }
                        },
                        have: {
                            property: function (prop) {
                                totalTests++;
                                if (actual && actual[prop] !== undefined) {
                                    passedTests++;
                                    console.log(`      ✅ PASS: Object has property "${prop}"`);
                                    reportLines.push(`    PASS: Object has property "${prop}"`);
                                } else {
                                    failedTests++;
                                    console.log(`      ❌ FAIL: Missing property "${prop}"`);
                                    reportLines.push(`    FAIL: Missing property "${prop}"`);
                                }
                            }
                        },
                        be: {
                            get true() {
                                totalTests++;
                                if (actual === true) {
                                    passedTests++;
                                    console.log(`      ✅ PASS: Condition is true`);
                                    reportLines.push(`    PASS: Condition is true`);
                                } else {
                                    failedTests++;
                                    console.log(`      ❌ FAIL: Condition is not true`);
                                    reportLines.push(`    FAIL: Condition is not true`);
                                }
                            }
                        }
                    }
                };
            },
            test: function (testName, testFn) {
                try {
                    testFn();
                } catch (e) {
                    failedTests++;
                    console.log(`      ❌ ERROR in test "${testName}": ${e.message}`);
                    reportLines.push(`    ERROR in test "${testName}": ${e.message}`);
                }
            }
        };

        if (req.tests && req.tests.length > 0) {
            try {
                const scriptSource = req.tests.join('\n');
                const runTestFn = new Function('pm', scriptSource);
                runTestFn(pm);
            } catch (err) {
                console.log(`      ⚠️ Script error: ${err.message}`);
                reportLines.push(`    Script error: ${err.message}`);
            }
        }

        console.log('');
        reportLines.push('');
    }

    // Cleanup: restore Costume 15 availability
    await makeRequest('POST', '/hires/return', { costume_id: 15 });

    console.log('======================================================================');
    console.log(`📊 EXECUTION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL TESTS: ${totalTests})`);
    console.log('======================================================================\n');

    reportLines.push('======================================================================');
    reportLines.push(`SUMMARY: ${passedTests}/${totalTests} Assertions Passed (${failedTests} Failed)`);
    reportLines.push('======================================================================');

    const reportPath = path.join(__dirname, 'Postman_Screenshots', 'postman_execution_report.txt');
    fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
    console.log(`[✓] Genuine test report saved to: ${reportPath}`);

    server.close();
    process.exit(failedTests > 0 ? 1 : 0);
}

runCollection().catch(err => {
    console.error('Collection runner error:', err);
    if (server) server.close();
    process.exit(1);
});
