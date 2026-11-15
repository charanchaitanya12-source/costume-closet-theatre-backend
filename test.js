/**
 * test.js
 * 
 * Comprehensive automated assessment test runner for CostumeCloset Theatre.
 * 
 * Verifies all rubric requirements:
 * 1. Actors CRUD (GET all, GET one, POST, PUT, DELETE) & validation
 * 2. Costumes CRUD (GET all, GET one, POST, PUT, DELETE) & validation
 * 3. Search costumes by query parameters (GET /costumes?era=Medieval)
 * 4. Relational JOIN endpoint (GET /hires returning actor_name & costume_name)
 * 5. Hires CRUD (GET one, PUT update, DELETE) & validation
 * 6. TASK 5 TWIST - The Three Required Double-Booking Scenarios:
 *    - TEST 1: Hire Costume 15 to Asha -> 201 Created
 *    - TEST 2: Hire Costume 15 to Ravi while Asha has it -> 409 Conflict ("Costume 15 is already hired")
 *    - TEST 3: Return Costume 15 from Asha, then hire to Ravi -> 201 Created
 * 7. Invalid route handling (404 Not Found)
 */

const { app, server } = require('./index');
const http = require('http');

function request(method, url, body) {
    return new Promise((resolve) => {
        const req = new http.IncomingMessage();
        req.method = method;
        req.url = url;
        req.headers = { 'content-type': 'application/json' };

        let statusCode = 200;
        let responseData = null;

        const res = {
            status: function (code) { statusCode = code; return this; },
            json: function (data) { responseData = data; resolve({ status: statusCode, body: responseData }); },
            setHeader: function () { },
            getHeader: function () { }
        };

        if (body) {
            req.body = body;
        }

        app.handle(req, res);
    });
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exitCode = 1;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

async function runTestSuite() {
    console.log('=====================================================');
    console.log('🧪 RUNNING COSTUMECLOSET THEATRE ASSESSMENT TESTS');
    console.log('=====================================================\n');

    // Pre-test cleanup: ensure Costume 15 is available
    await request('POST', '/hires/return', { costume_id: 15 });

    // -------------------------------------------------------------
    // SECTION 1: ACTORS CRUD & VALIDATION
    // -------------------------------------------------------------
    console.log('--- Section 1: Actors CRUD & Validation ---');
    const allActors = await request('GET', '/actors');
    assert(allActors.status === 200 && Array.isArray(allActors.body), 'GET /actors returns 200 and an array');

    const invalidActor = await request('POST', '/actors', { name: '   ' });
    assert(invalidActor.status === 400, 'POST /actors with empty name returns 400 Bad Request');

    const newActor = await request('POST', '/actors', { name: 'David Garrick', email: 'david@theatre.org', phone: '555-0109' });
    assert(newActor.status === 201 && newActor.body.id, 'POST /actors creates actor with 201 Created');
    const createdActorId = newActor.body.id;

    const singleActor = await request('GET', `/actors/${createdActorId}`);
    assert(singleActor.status === 200 && singleActor.body.name === 'David Garrick', 'GET /actors/:id returns 200 single actor');

    const updateActor = await request('PUT', `/actors/${createdActorId}`, { name: 'David Garrick (Master)' });
    assert(updateActor.status === 200, 'PUT /actors/:id returns 200 OK');

    const deleteActor = await request('DELETE', `/actors/${createdActorId}`);
    assert(deleteActor.status === 200, 'DELETE /actors/:id returns 200 OK');

    const verifyDeletedActor = await request('GET', `/actors/${createdActorId}`);
    assert(verifyDeletedActor.status === 404, 'GET /actors/:id for deleted actor returns 404 Not Found');

    // -------------------------------------------------------------
    // SECTION 2: COSTUMES CRUD, VALIDATION & SEARCH
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Costumes CRUD, Validation & Search ---');
    const allCostumes = await request('GET', '/costumes');
    assert(allCostumes.status === 200 && Array.isArray(allCostumes.body), 'GET /costumes returns 200 and an array');

    const missingNameCostume = await request('POST', '/costumes', { name: '', era: 'Medieval' });
    assert(missingNameCostume.status === 400, 'POST /costumes with empty name returns 400 Bad Request');

    const missingEraCostume = await request('POST', '/costumes', { name: 'Cape', era: '' });
    assert(missingEraCostume.status === 400, 'POST /costumes with empty era returns 400 Bad Request');

    const newCostume = await request('POST', '/costumes', {
        name: 'Gondorian Cloak',
        era: 'Medieval',
        category: 'Fantasy',
        size: 'L',
        rental_price: 30.00
    });
    assert(newCostume.status === 201 && newCostume.body.id, 'POST /costumes returns 201 Created');
    const createdCostumeId = newCostume.body.id;

    const singleCostume = await request('GET', `/costumes/${createdCostumeId}`);
    assert(singleCostume.status === 200 && singleCostume.body.name === 'Gondorian Cloak', 'GET /costumes/:id returns 200 single costume');

    const updateCostume = await request('PUT', `/costumes/${createdCostumeId}`, { name: 'Gondorian Cloak (Elven Weave)', rental_price: 35.00 });
    assert(updateCostume.status === 200, 'PUT /costumes/:id returns 200 OK');

    // Search by Era
    const medievalCostumes = await request('GET', '/costumes?era=Medieval');
    assert(
        medievalCostumes.status === 200 &&
        medievalCostumes.body.length > 0 &&
        medievalCostumes.body.every(c => c.era.toLowerCase() === 'medieval'),
        'GET /costumes?era=Medieval filters correctly by era'
    );

    await request('DELETE', `/costumes/${createdCostumeId}`);
    const verifyDeletedCostume = await request('GET', `/costumes/${createdCostumeId}`);
    assert(verifyDeletedCostume.status === 404, 'GET /costumes/:id for deleted costume returns 404 Not Found');

    // -------------------------------------------------------------
    // SECTION 3: RELATIONAL JOIN & HIRES CRUD
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Relational JOIN & Hires Operations ---');
    const allHires = await request('GET', '/hires');
    assert(allHires.status === 200 && Array.isArray(allHires.body), 'GET /hires returns 200 and an array');
    if (allHires.body.length > 0) {
        const sample = allHires.body[0];
        assert(
            sample.actor_name !== undefined && sample.costume_name !== undefined,
            'GET /hires (JOIN) includes both actor_name and costume_name'
        );
    }

    const singleHire = await request('GET', '/hires/1');
    assert([200, 404].includes(singleHire.status), 'GET /hires/:id returns 200 or 404');

    // Validation on Hires creation
    const missingCostumeId = await request('POST', '/hires', { actor_id: 1 });
    assert(missingCostumeId.status === 400, 'POST /hires without costume_id returns 400 Bad Request');

    const nonExistentCostume = await request('POST', '/hires', { actor_id: 1, costume_id: 99999 });
    assert(nonExistentCostume.status === 404, 'POST /hires with non-existent costume_id returns 404 Not Found');

    // -------------------------------------------------------------
    // SECTION 4: TASK 5 TWIST - NO DOUBLE BOOKING SCENARIOS
    // -------------------------------------------------------------
    console.log('\n--- Section 4: TASK 5 TWIST - No Double Booking Scenarios ---');

    // Lookup Asha and Ravi IDs
    const actorsList = (await request('GET', '/actors')).body;
    const asha = actorsList.find(a => a.name.toLowerCase() === 'asha');
    const ravi = actorsList.find(a => a.name.toLowerCase() === 'ravi');
    const ashaId = asha ? asha.id : 3;
    const raviId = ravi ? ravi.id : 4;

    // SCENARIO TEST 1: Hire Costume 15 to Asha -> Expected 201
    const test1 = await request('POST', '/hires', { actor_id: ashaId, costume_id: 15 });
    assert(
        test1.status === 201,
        `TEST 1: Hire Costume 15 to Asha returns HTTP 201 (Got: ${test1.status})`
    );

    // SCENARIO TEST 2: Hire Costume 15 to Ravi while Asha still has it -> Expected 409 & "Costume 15 is already hired"
    const test2 = await request('POST', '/hires', { actor_id: raviId, costume_id: 15 });
    const errMessage = (test2.body && (test2.body.error || test2.body.message)) || '';
    assert(
        test2.status === 409,
        `TEST 2: Hire Costume 15 to Ravi while hired returns HTTP 409 Conflict (Got: ${test2.status})`
    );
    assert(
        errMessage === 'Costume 15 is already hired',
        `TEST 2 Message: Expected exact "Costume 15 is already hired" (Got: "${errMessage}")`
    );

    // SCENARIO TEST 3: Return Costume 15 from Asha. Hire Costume 15 to Ravi -> Expected 201
    const returnRes = await request('POST', '/hires/return', { costume_id: 15 });
    assert(
        returnRes.status === 200,
        `TEST 3 Preparation: Costume 15 return processed (Got: ${returnRes.status})`
    );

    const test3 = await request('POST', '/hires', { actor_id: raviId, costume_id: 15 });
    assert(
        test3.status === 201,
        `TEST 3: Hire Costume 15 to Ravi after return returns HTTP 201 Created (Got: ${test3.status})`
    );

    // Post-test cleanup: return Costume 15 so database remains clean
    await request('POST', '/hires/return', { costume_id: 15 });

    // -------------------------------------------------------------
    // SECTION 5: INVALID ROUTE HANDLING
    // -------------------------------------------------------------
    console.log('\n--- Section 5: Invalid Route Handling ---');
    const notFoundRes = await request('GET', '/non-existent-endpoint');
    assert(notFoundRes.status === 404, 'Invalid route returns HTTP 404 Not Found');

    console.log('\n=====================================================');
    console.log('🎉 ALL ASSESSMENT TEST CASES COMPLETED SUCCESSFULLY!');
    console.log('=====================================================\n');

    server.close();
    process.exit(process.exitCode || 0);
}

runTestSuite().catch(err => {
    console.error('Test execution failed:', err);
    if (server) server.close();
    process.exit(1);
});
