/**
 * index.js
 * 
 * Express REST API server for CostumeCloset Theatre.
 * Runs on port 3000 and provides:
 *  - Full CRUD operations for Actors, Costumes, and Hires
 *  - Input validation and search query filtering (e.g. GET /costumes?era=Medieval)
 *  - Relational JOIN endpoint for hires with actor and costume names
 *  - Strict No-Double-Booking business rule with atomic SQLite transactions
 *  - Dedicated return endpoints for costumes
 *  - Centralized 404 and error-handling middleware
 */

const express = require('express');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS for external access / frontend clients
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ==========================================
// ROOT HEALTH / API OVERVIEW ENDPOINT
// ==========================================
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to the CostumeCloset Theatre API',
        version: '1.0.0',
        endpoints: {
            actors: {
                getAll: 'GET /actors',
                search: 'GET /actors?name=Asha',
                getOne: 'GET /actors/:id',
                create: 'POST /actors',
                update: 'PUT /actors/:id',
                delete: 'DELETE /actors/:id'
            },
            costumes: {
                getAll: 'GET /costumes',
                searchByEra: 'GET /costumes?era=Medieval',
                searchByCategory: 'GET /costumes?category=Armor',
                searchByStatus: 'GET /costumes?status=available',
                getOne: 'GET /costumes/:id',
                create: 'POST /costumes',
                update: 'PUT /costumes/:id',
                delete: 'DELETE /costumes/:id'
            },
            hires: {
                getAllWithJoin: 'GET /hires',
                filterByStatus: 'GET /hires?status=active',
                getOne: 'GET /hires/:id',
                createHire: 'POST /hires',
                returnHire: 'PUT /hires/:id/return or POST /hires/return',
                update: 'PUT /hires/:id',
                delete: 'DELETE /hires/:id'
            }
        }
    });
});

// ==========================================
// ACTORS CRUD ENDPOINTS
// ==========================================

/**
 * GET ALL ACTORS (supports ?name= search)
 * GET /actors
 * Status: 200 OK | 500 Internal Server Error
 */
app.get('/actors', (req, res) => {
    const { name } = req.query;
    let query = 'SELECT * FROM actors';
    const params = [];

    if (name) {
        query += ' WHERE LOWER(name) LIKE ?';
        params.push(`%${name.toLowerCase().trim()}%`);
    }

    query += ' ORDER BY id ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        res.status(200).json(rows);
    });
});

/**
 * GET SINGLE ACTOR BY ID
 * GET /actors/:id
 * Status: 200 OK | 404 Not Found | 500 Internal Server Error
 */
app.get('/actors/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM actors WHERE id = ?';

    db.get(query, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (!row) {
            return res.status(404).json({ error: `Actor with ID ${id} not found.` });
        }
        res.status(200).json(row);
    });
});

/**
 * ADD NEW ACTOR
 * POST /actors
 * Validation: name is required and cannot be empty
 * Status: 201 Created | 400 Bad Request | 500 Internal Server Error
 */
app.post('/actors', (req, res) => {
    const { name, email, phone } = req.body;

    // Validation: name must not be empty
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Validation error: Actor name is required.' });
    }

    const query = 'INSERT INTO actors (name, email, phone) VALUES (?, ?, ?)';
    const params = [name.trim(), email ? email.trim() : null, phone ? phone.trim() : null];

    db.run(query, params, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        res.status(201).json({
            message: 'Actor created successfully',
            id: this.lastID,
            actor: {
                id: this.lastID,
                name: params[0],
                email: params[1],
                phone: params[2]
            }
        });
    });
});

/**
 * UPDATE ACTOR
 * PUT /actors/:id
 * Validation: name cannot be empty
 * Status: 200 OK | 400 Bad Request | 404 Not Found | 500 Internal Server Error
 */
app.put('/actors/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Validation error: Actor name is required for update.' });
    }

    const query = 'UPDATE actors SET name = ?, email = ?, phone = ? WHERE id = ?';
    const params = [name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, id];

    db.run(query, params, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Actor with ID ${id} not found.` });
        }
        res.status(200).json({
            message: 'Actor updated successfully',
            updatedId: Number(id)
        });
    });
});

/**
 * DELETE ACTOR
 * DELETE /actors/:id
 * Status: 200 OK | 404 Not Found | 500 Internal Server Error
 */
app.delete('/actors/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM actors WHERE id = ?';

    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Actor with ID ${id} not found.` });
        }
        res.status(200).json({
            message: `Actor with ID ${id} deleted successfully.`
        });
    });
});

// ==========================================
// COSTUMES CRUD & SEARCH ENDPOINTS
// ==========================================

/**
 * GET ALL COSTUMES (Supports search query params: era, category, status, name)
 * Example: GET /costumes?era=Medieval
 * Status: 200 OK | 500 Internal Server Error
 */
app.get('/costumes', (req, res) => {
    const { era, category, status, name } = req.query;
    let query = 'SELECT * FROM costumes';
    const conditions = [];
    const params = [];

    if (era) {
        conditions.push('LOWER(era) = LOWER(?)');
        params.push(era.trim());
    }
    if (category) {
        conditions.push('LOWER(category) = LOWER(?)');
        params.push(category.trim());
    }
    if (status) {
        conditions.push('LOWER(status) = LOWER(?)');
        params.push(status.trim());
    }
    if (name) {
        conditions.push('LOWER(name) LIKE ?');
        params.push(`%${name.toLowerCase().trim()}%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        res.status(200).json(rows);
    });
});

/**
 * GET SINGLE COSTUME BY ID
 * GET /costumes/:id
 * Status: 200 OK | 404 Not Found | 500 Internal Server Error
 */
app.get('/costumes/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM costumes WHERE id = ?';

    db.get(query, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (!row) {
            return res.status(404).json({ error: `Costume with ID ${id} not found.` });
        }
        res.status(200).json(row);
    });
});

/**
 * ADD NEW COSTUME
 * POST /costumes
 * Validation: name and era are required and cannot be empty
 * Status: 201 Created | 400 Bad Request | 500 Internal Server Error
 */
app.post('/costumes', (req, res) => {
    const { name, era, category, size, rental_price, status } = req.body;

    // Validation: name is required
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Validation error: Costume name is required.' });
    }

    // Validation: era is required
    if (!era || typeof era !== 'string' || era.trim() === '') {
        return res.status(400).json({ error: 'Validation error: Costume era is required.' });
    }

    const query = `
        INSERT INTO costumes (name, era, category, size, rental_price, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
        name.trim(),
        era.trim(),
        category ? category.trim() : 'General',
        size ? size.trim() : 'Standard',
        rental_price !== undefined ? parseFloat(rental_price) : 0.0,
        status ? status.trim() : 'available'
    ];

    db.run(query, params, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        res.status(201).json({
            message: 'Costume created successfully',
            id: this.lastID,
            costume: {
                id: this.lastID,
                name: params[0],
                era: params[1],
                category: params[2],
                size: params[3],
                rental_price: params[4],
                status: params[5]
            }
        });
    });
});

/**
 * UPDATE COSTUME
 * PUT /costumes/:id
 * Status: 200 OK | 400 Bad Request | 404 Not Found | 500 Internal Server Error
 */
app.put('/costumes/:id', (req, res) => {
    const { id } = req.params;
    const { name, era, category, size, rental_price, status } = req.body;

    // Validate that if name or era is provided, it must not be empty
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
        return res.status(400).json({ error: 'Validation error: Costume name cannot be empty.' });
    }
    if (era !== undefined && (typeof era !== 'string' || era.trim() === '')) {
        return res.status(400).json({ error: 'Validation error: Costume era cannot be empty.' });
    }

    const query = `
        UPDATE costumes
        SET name = COALESCE(?, name),
            era = COALESCE(?, era),
            category = COALESCE(?, category),
            size = COALESCE(?, size),
            rental_price = COALESCE(?, rental_price),
            status = COALESCE(?, status)
        WHERE id = ?
    `;
    const params = [
        name !== undefined ? name.trim() : null,
        era !== undefined ? era.trim() : null,
        category !== undefined ? category.trim() : null,
        size !== undefined ? size.trim() : null,
        rental_price !== undefined ? parseFloat(rental_price) : null,
        status !== undefined ? status.trim() : null,
        id
    ];

    db.run(query, params, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Costume with ID ${id} not found.` });
        }
        res.status(200).json({
            message: 'Costume updated successfully',
            updatedId: Number(id)
        });
    });
});

/**
 * DELETE COSTUME
 * DELETE /costumes/:id
 * Status: 200 OK | 404 Not Found | 500 Internal Server Error
 */
app.delete('/costumes/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM costumes WHERE id = ?';

    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Costume with ID ${id} not found.` });
        }
        res.status(200).json({
            message: `Costume with ID ${id} deleted successfully.`
        });
    });
});

// ==========================================
// HIRES ENDPOINTS & NO-DOUBLE-BOOKING LOGIC
// ==========================================

/**
 * GET ALL HIRES WITH JOIN (returns actor name and costume name)
 * Supports query filter: ?status=active
 * GET /hires
 * Status: 200 OK | 500 Internal Server Error
 */
app.get('/hires', (req, res) => {
    const { status, actor_id, costume_id } = req.query;
    let query = `
        SELECT 
            hires.id AS hire_id,
            hires.hire_date,
            hires.return_date,
            hires.status AS hire_status,
            actors.id AS actor_id,
            actors.name AS actor_name,
            actors.email AS actor_email,
            costumes.id AS costume_id,
            costumes.name AS costume_name,
            costumes.era AS costume_era,
            costumes.category AS costume_category,
            costumes.rental_price
        FROM hires
        INNER JOIN actors ON hires.actor_id = actors.id
        INNER JOIN costumes ON hires.costume_id = costumes.id
    `;
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push('LOWER(hires.status) = LOWER(?)');
        params.push(status.trim());
    }
    if (actor_id) {
        conditions.push('hires.actor_id = ?');
        params.push(actor_id);
    }
    if (costume_id) {
        conditions.push('hires.costume_id = ?');
        params.push(costume_id);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY hires.id ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error during JOIN: ' + err.message });
        }
        res.status(200).json(rows);
    });
});

/**
 * GET SINGLE HIRE BY ID WITH JOIN
 * GET /hires/:id
 * Status: 200 OK | 404 Not Found | 500 Internal Server Error
 */
app.get('/hires/:id', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT 
            hires.id AS hire_id,
            hires.hire_date,
            hires.return_date,
            hires.status AS hire_status,
            actors.id AS actor_id,
            actors.name AS actor_name,
            actors.email AS actor_email,
            costumes.id AS costume_id,
            costumes.name AS costume_name,
            costumes.era AS costume_era,
            costumes.category AS costume_category,
            costumes.rental_price
        FROM hires
        INNER JOIN actors ON hires.actor_id = actors.id
        INNER JOIN costumes ON hires.costume_id = costumes.id
        WHERE hires.id = ?
    `;

    db.get(query, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (!row) {
            return res.status(404).json({ error: `Hire with ID ${id} not found.` });
        }
        res.status(200).json(row);
    });
});

/**
 * ADD NEW HIRE (TASK 5 TWIST: NO DOUBLE BOOKING)
 * 
 * Business Rules:
 * 1. A costume cannot be hired to two active actors at the same time.
 * 2. If available, create hire -> 201 Created.
 * 3. If costume is already actively hired -> 409 Conflict.
 *    Exact Error Message: "Costume <id> is already hired"
 * 4. Handled atomically using SQLite transaction logic.
 * 
 * Supports both { actor_id, costume_id } and { actor_name, costume_id }.
 * 
 * Status: 201 Created | 400 Bad Request | 404 Not Found | 409 Conflict | 500 Internal Server Error
 */
app.post('/hires', (req, res) => {
    const { actor_id, costume_id, actor_name, actor, hire_date } = req.body;

    // 1. Validate costume_id
    if (costume_id === undefined || costume_id === null || costume_id === '') {
        return res.status(400).json({ error: 'Validation error: Costume ID is required.' });
    }

    const costumeIdNum = Number(costume_id);
    if (isNaN(costumeIdNum) || costumeIdNum <= 0) {
        return res.status(400).json({ error: 'Validation error: Invalid Costume ID.' });
    }

    // 2. Validate actor (must provide actor_id or actor_name/actor)
    const targetActorName = (actor_name || actor);
    if ((actor_id === undefined || actor_id === null || actor_id === '') && !targetActorName) {
        return res.status(400).json({ error: 'Validation error: Actor ID or Actor name is required.' });
    }

    // Helper function to process hire once actor_id and costume are resolved
    function processHire(resolvedActorId) {
        // Step A: Check if costume exists in costumes table
        db.get('SELECT * FROM costumes WHERE id = ?', [costumeIdNum], (costumeErr, costumeRow) => {
            if (costumeErr) {
                return res.status(500).json({ error: 'Database error: ' + costumeErr.message });
            }
            if (!costumeRow) {
                return res.status(404).json({ error: `Costume with ID ${costumeIdNum} not found.` });
            }

            // Step B: TWIST - Check if costume is already actively hired
            db.get("SELECT id, actor_id FROM hires WHERE costume_id = ? AND status = 'active'", [costumeIdNum], (hireCheckErr, activeHire) => {
                if (hireCheckErr) {
                    return res.status(500).json({ error: 'Database error: ' + hireCheckErr.message });
                }

                // If already actively hired, reject with 409 Conflict and exact required message
                if (activeHire) {
                    return res.status(409).json({
                        error: `Costume ${costumeIdNum} is already hired`,
                        message: `Costume ${costumeIdNum} is already hired`
                    });
                }

                // Step C: Atomically create the hire and update costume status
                db.serialize(() => {
                    db.run('BEGIN IMMEDIATE', (beginErr) => {
                        if (beginErr) {
                            return res.status(500).json({ error: 'Transaction error: ' + beginErr.message });
                        }

                        // Re-verify within transaction boundary
                        db.get("SELECT id FROM hires WHERE costume_id = ? AND status = 'active'", [costumeIdNum], (reCheckErr, inFlightHire) => {
                            if (inFlightHire) {
                                db.run('ROLLBACK');
                                return res.status(409).json({
                                    error: `Costume ${costumeIdNum} is already hired`,
                                    message: `Costume ${costumeIdNum} is already hired`
                                });
                            }

                            const insertHireQuery = `
                                INSERT INTO hires (actor_id, costume_id, hire_date, status)
                                VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), 'active')
                            `;
                            const hireParams = [resolvedActorId, costumeIdNum, hire_date || null];

                            db.run(insertHireQuery, hireParams, function (insertErr) {
                                if (insertErr) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: 'Database error: ' + insertErr.message });
                                }

                                const newHireId = this.lastID;

                                // Update costume status to 'rented'
                                db.run("UPDATE costumes SET status = 'rented' WHERE id = ?", [costumeIdNum], (updErr) => {
                                    if (updErr) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Database error updating costume status: ' + updErr.message });
                                    }

                                    db.run('COMMIT', (commitErr) => {
                                        if (commitErr) {
                                            return res.status(500).json({ error: 'Commit error: ' + commitErr.message });
                                        }

                                        res.status(201).json({
                                            message: 'Hire created successfully',
                                            id: newHireId,
                                            hire: {
                                                id: newHireId,
                                                actor_id: resolvedActorId,
                                                costume_id: costumeIdNum,
                                                hire_date: hire_date || new Date().toISOString(),
                                                status: 'active'
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    // Resolve actor_id (either directly provided or looked up by name)
    if (actor_id !== undefined && actor_id !== null && actor_id !== '') {
        const actorIdNum = Number(actor_id);
        if (isNaN(actorIdNum) || actorIdNum <= 0) {
            return res.status(400).json({ error: 'Validation error: Invalid Actor ID.' });
        }
        db.get('SELECT id FROM actors WHERE id = ?', [actorIdNum], (err, actorRow) => {
            if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
            if (!actorRow) return res.status(404).json({ error: `Actor with ID ${actorIdNum} not found.` });
            processHire(actorIdNum);
        });
    } else {
        const trimmedName = String(targetActorName).trim();
        db.get('SELECT id FROM actors WHERE LOWER(name) = LOWER(?)', [trimmedName], (err, actorRow) => {
            if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
            if (actorRow) {
                processHire(actorRow.id);
            } else {
                // Auto-create actor if name was specified directly (e.g. 'Asha')
                db.run('INSERT INTO actors (name) VALUES (?)', [trimmedName], function (insErr) {
                    if (insErr) return res.status(500).json({ error: 'Database error creating actor: ' + insErr.message });
                    processHire(this.lastID);
                });
            }
        });
    }
});

/**
 * RETURN COSTUME ENDPOINT (by Hire ID)
 * PUT /hires/:id/return or POST /hires/:id/return
 * Updates hire status to 'returned', sets return_date, and marks costume 'available'
 * Status: 200 OK | 404 Not Found | 500 Internal Server Error
 */
function handleReturnByHireId(req, res) {
    const { id } = req.params;

    db.get('SELECT * FROM hires WHERE id = ?', [id], (err, hire) => {
        if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
        if (!hire) return res.status(404).json({ error: `Hire with ID ${id} not found.` });

        if (hire.status === 'returned') {
            return res.status(200).json({
                message: `Hire with ID ${id} is already marked as returned.`,
                hire
            });
        }

        const returnDate = new Date().toISOString();
        db.serialize(() => {
            db.run(
                "UPDATE hires SET status = 'returned', return_date = ? WHERE id = ?",
                [returnDate, id],
                function (updateHireErr) {
                    if (updateHireErr) {
                        return res.status(500).json({ error: 'Database error updating hire: ' + updateHireErr.message });
                    }

                    db.run(
                        "UPDATE costumes SET status = 'available' WHERE id = ?",
                        [hire.costume_id],
                        (updateCostumeErr) => {
                            if (updateCostumeErr) {
                                return res.status(500).json({ error: 'Database error updating costume status: ' + updateCostumeErr.message });
                            }
                            res.status(200).json({
                                message: `Costume ${hire.costume_id} returned successfully. Hire ${id} closed.`,
                                hire_id: Number(id),
                                costume_id: hire.costume_id,
                                return_date: returnDate,
                                status: 'returned'
                            });
                        }
                    );
                }
            );
        });
    });
}

app.put('/hires/:id/return', handleReturnByHireId);
app.post('/hires/:id/return', handleReturnByHireId);

/**
 * RETURN COSTUME BY COSTUME ID OR BODY PAYLOAD
 * POST /hires/return or PUT /hires/return
 * Payload: { costume_id: 15 } or { hire_id: ... } or { actor_name: 'Asha', costume_id: 15 }
 * Status: 200 OK | 400 Bad Request | 404 Not Found | 500 Internal Server Error
 */
function handleReturnByCostumePayload(req, res) {
    const { costume_id, hire_id } = req.body;

    if (hire_id) {
        req.params = { id: hire_id };
        return handleReturnByHireId(req, res);
    }

    if (!costume_id) {
        return res.status(400).json({ error: 'Validation error: costume_id or hire_id is required to process return.' });
    }

    const costumeIdNum = Number(costume_id);
    db.get("SELECT * FROM hires WHERE costume_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1", [costumeIdNum], (err, activeHire) => {
        if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
        if (!activeHire) {
            return res.status(404).json({ error: `No active hire found for Costume ID ${costumeIdNum}.` });
        }

        const returnDate = new Date().toISOString();
        db.serialize(() => {
            db.run(
                "UPDATE hires SET status = 'returned', return_date = ? WHERE id = ?",
                [returnDate, activeHire.id],
                (updErr) => {
                    if (updErr) return res.status(500).json({ error: 'Database error: ' + updErr.message });

                    db.run("UPDATE costumes SET status = 'available' WHERE id = ?", [costumeIdNum], (costumeUpdErr) => {
                        if (costumeUpdErr) return res.status(500).json({ error: 'Database error: ' + costumeUpdErr.message });

                        res.status(200).json({
                            message: `Costume ${costumeIdNum} returned successfully.`,
                            hire_id: activeHire.id,
                            costume_id: costumeIdNum,
                            return_date: returnDate,
                            status: 'returned'
                        });
                    });
                }
            );
        });
    });
}

app.post('/hires/return', handleReturnByCostumePayload);
app.put('/hires/return', handleReturnByCostumePayload);
app.put('/costumes/:id/return', (req, res) => {
    req.body = { costume_id: req.params.id };
    return handleReturnByCostumePayload(req, res);
});

/**
 * UPDATE HIRE (e.g. updating hire_date, return_date, or status)
 * PUT /hires/:id
 * Status: 200 OK | 404 Not Found | 500 Internal Server Error
 */
app.put('/hires/:id', (req, res) => {
    const { id } = req.params;
    const { hire_date, return_date, status } = req.body;

    const query = `
        UPDATE hires
        SET hire_date = COALESCE(?, hire_date),
            return_date = COALESCE(?, return_date),
            status = COALESCE(?, status)
        WHERE id = ?
    `;
    const params = [hire_date || null, return_date || null, status || null, id];

    db.run(query, params, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Hire with ID ${id} not found.` });
        }

        // If updated to 'returned', ensure costume is marked 'available'
        if (status && status.toLowerCase() === 'returned') {
            db.get('SELECT costume_id FROM hires WHERE id = ?', [id], (hErr, hRow) => {
                if (!hErr && hRow) {
                    db.run("UPDATE costumes SET status = 'available' WHERE id = ?", [hRow.costume_id]);
                }
            });
        }

        res.status(200).json({
            message: 'Hire updated successfully',
            updatedId: Number(id)
        });
    });
});

/**
 * DELETE HIRE
 * DELETE /hires/:id
 * Status: 200 OK | 404 Not Found | 500 Internal Server Error
 */
app.delete('/hires/:id', (req, res) => {
    const { id } = req.params;

    // Check if hire was active to restore costume availability
    db.get('SELECT costume_id, status FROM hires WHERE id = ?', [id], (checkErr, row) => {
        if (checkErr) return res.status(500).json({ error: 'Database error: ' + checkErr.message });
        if (!row) return res.status(404).json({ error: `Hire with ID ${id} not found.` });

        db.run('DELETE FROM hires WHERE id = ?', [id], function (delErr) {
            if (delErr) return res.status(500).json({ error: 'Database error: ' + delErr.message });

            if (row.status === 'active') {
                db.run("UPDATE costumes SET status = 'available' WHERE id = ?", [row.costume_id]);
            }

            res.status(200).json({
                message: `Hire with ID ${id} deleted successfully.`
            });
        });
    });
});

// ==========================================
// 404 NOT FOUND MIDDLEWARE (Invalid Routes)
// ==========================================
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`
    });
});

// ==========================================
// GLOBAL ERROR-HANDLING MIDDLEWARE
// ==========================================
app.use((err, req, res, next) => {
    console.error('[-] Unhandled server error:', err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start the server (binds to 0.0.0.0 for container hosting like Render)
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[🚀] CostumeCloset Server is running at http://0.0.0.0:${PORT}`);
});

module.exports = { app, server };
