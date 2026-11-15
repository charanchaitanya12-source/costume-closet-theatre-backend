# CostumeCloset Theatre – Costume Hire Management System

A Node.js and Express backend API backed by SQLite for managing costume rentals, actors, and hires in a theatre production environment.

---

## 1. Project Title
**CostumeCloset Theatre – Backend Management System**

## 2. Project Description
CostumeCloset Theatre is a backend system designed for wardrobe managers and theatre staff to track costume inventories, actor profiles, and active costume hires. It features relational database modeling in SQLite, full RESTful CRUD capabilities, search and filtering (e.g., by historical era), and an atomic booking engine that enforces a strict **No-Double-Booking** business rule.

## 3. Problem Statement
In busy theatre productions, costumes are valuable, unique assets frequently loaned out to different cast members across multiple acts and rehearsals. Without a centralized digital tracking system:
- Costumes could easily be double-booked to multiple actors simultaneously, causing costume conflicts during live performances.
- Rental histories, returns, and inventory statuses become untracked.
- Wardrobe teams cannot quickly query costumes suited for specific historical periods or productions.

This project solves these operational challenges by offering an automated, reliable backend with atomic booking validation.

## 4. Technologies Used
- **Runtime Environment:** Node.js (v18+)
- **Web Framework:** Express.js 5.x
- **Database Engine:** SQLite3 (via `sqlite3` driver)
- **Data Integrity:** SQLite Foreign Key Constraints (`PRAGMA foreign_keys = ON;`)
- **API Testing:** Postman & Built-in Node test runner

## 5. Project Folder Structure
```text
costume-closet-theatre-backend/
│
├── database.js                     # SQLite connection, schema setup & seeding
├── index.js                        # Express server, REST endpoints & business logic
├── test.js                         # Automated assessment test suite
├── run_postman_collection.js       # Programmatic Postman collection runner
├── costume_closet.db               # SQLite database file with initial schema & data
├── package.json                    # Project dependencies and npm scripts
├── package-lock.json               # Locked dependency tree
├── CostumeCloset_Postman_Collection.json # Postman test collection (v2.1.0)
├── .gitignore                      # Git exclusion rules
├── README.md                       # Comprehensive project documentation
└── Postman_Screenshots/            # Postman execution report & screenshots
    ├── postman_execution_report.txt
    ├── README.md
    ├── 01-get-actors.png
    ├── 02-add-actor.png
    ├── 03-get-costumes.png
    ├── 04-search-era.png
    ├── 05-add-costume.png
    ├── 06-join-hires.png
    ├── 07-booking-success.png
    ├── 08-double-booking-conflict.png
    ├── 09-return-and-rebook.png
    └── 10-validation-error.png
```

## 6. Database Tables and Relationships

The database consists of three relational tables:

```
┌──────────────────┐               ┌──────────────────┐
│      actors      │               │     costumes     │
├──────────────────┤               ├──────────────────┤
│ id (PK)          │               │ id (PK)          │
│ name (TEXT)      │◄─────┐ ┌─────►│ name (TEXT)      │
│ email (TEXT)     │      │ │      │ era (TEXT)       │
│ phone (TEXT)     │      │ │      │ category (TEXT)  │
└──────────────────┘      │ │      │ size (TEXT)      │
                          │ │      │ rental_price     │
                  ┌───────┴─┴────────┐ status             │
                  │      hires       │└──────────────────┘
                  ├──────────────────┤
                  │ id (PK)          │
                  │ actor_id (FK) ───┘
                  │ costume_id (FK) ───┘
                  │ hire_date (TEXT) │
                  │ return_date (TEXT│
                  │ status (TEXT)    │
                  └──────────────────┘
```

- **`actors` Table**: Stores actor records.
  - `id` (INTEGER, Primary Key, Autoincrement)
  - `name` (TEXT, NOT NULL)
  - `email` (TEXT, UNIQUE)
  - `phone` (TEXT)
- **`costumes` Table**: Stores costume inventory items.
  - `id` (INTEGER, Primary Key, Autoincrement)
  - `name` (TEXT, NOT NULL)
  - `era` (TEXT) - e.g., Medieval, Renaissance, Victorian, Gothic
  - `category` (TEXT) - e.g., Armor, Shakespearean, Period
  - `size` (TEXT) - e.g., S, M, L, XL
  - `rental_price` (REAL, DEFAULT 0.0)
  - `status` (TEXT, DEFAULT 'available') - 'available' | 'rented'
- **`hires` Table**: Tracks rental contracts between actors and costumes.
  - `id` (INTEGER, Primary Key, Autoincrement)
  - `actor_id` (INTEGER, NOT NULL, Foreign Key &rarr; `actors.id` ON DELETE CASCADE)
  - `costume_id` (INTEGER, NOT NULL, Foreign Key &rarr; `costumes.id` ON DELETE CASCADE)
  - `hire_date` (TEXT, DEFAULT CURRENT_TIMESTAMP)
  - `return_date` (TEXT, Nullable)
  - `status` (TEXT, DEFAULT 'active') - 'active' | 'returned'

## 7. API Endpoints with Methods

| Method | Endpoint | Description | Expected Status Codes |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | API status and endpoint directory | `200` |
| **GET** | `/actors` | Get all actors (supports `?name=...`) | `200`, `500` |
| **GET** | `/actors/:id` | Get single actor by ID | `200`, `404`, `500` |
| **POST** | `/actors` | Add new actor | `201`, `400`, `500` |
| **PUT** | `/actors/:id` | Update actor by ID | `200`, `400`, `404`, `500` |
| **DELETE** | `/actors/:id` | Delete actor by ID | `200`, `404`, `500` |
| **GET** | `/costumes` | Get all costumes (supports `?era=...`, `?category=...`, `?status=...`) | `200`, `500` |
| **GET** | `/costumes/:id` | Get single costume by ID | `200`, `404`, `500` |
| **POST** | `/costumes` | Add new costume | `201`, `400`, `500` |
| **PUT** | `/costumes/:id` | Update costume by ID | `200`, `400`, `404`, `500` |
| **DELETE** | `/costumes/:id` | Delete costume by ID | `200`, `404`, `500` |
| **GET** | `/hires` | Get all hires with JOIN (actor name & costume name) | `200`, `500` |
| **GET** | `/hires/:id` | Get single hire with JOIN details | `200`, `404`, `500` |
| **POST** | `/hires` | Create a hire (**enforces No-Double-Booking rule**) | `201`, `400`, `404`, `409`, `500` |
| **PUT** | `/hires/:id/return` | Mark hire as returned and free costume | `200`, `404`, `500` |
| **POST** | `/hires/return` | Return costume by `{ costume_id }` payload | `200`, `400`, `404`, `500` |
| **PUT** | `/hires/:id` | Update hire details | `200`, `404`, `500` |
| **DELETE** | `/hires/:id` | Delete hire record | `200`, `404`, `500` |

## 8. Example API Requests and Responses

### Example 1: Add a Costume (`POST /costumes`)
**Request Body:**
```json
{
  "name": "Medieval Knight Armor",
  "era": "Medieval",
  "category": "Armor",
  "size": "L",
  "rental_price": 50.00
}
```
**Response (`201 Created`):**
```json
{
  "message": "Costume created successfully",
  "id": 15,
  "costume": {
    "id": 15,
    "name": "Medieval Knight Armor",
    "era": "Medieval",
    "category": "Armor",
    "size": "L",
    "rental_price": 50,
    "status": "available"
  }
}
```

### Example 2: Search Costumes by Era (`GET /costumes?era=Medieval`)
**Response (`200 OK`):**
```json
[
  {
    "id": 15,
    "name": "Medieval Knight Armor",
    "era": "Medieval",
    "category": "Armor",
    "size": "L",
    "rental_price": 50,
    "status": "available"
  }
]
```

### Example 3: Hire Costume (`POST /hires`)
**Request Body:**
```json
{
  "actor_name": "Asha",
  "costume_id": 15
}
```
**Response (`201 Created`):**
```json
{
  "message": "Hire created successfully",
  "id": 3,
  "hire": {
    "id": 3,
    "actor_id": 3,
    "costume_id": 15,
    "hire_date": "2026-11-15T14:19:02.906Z",
    "status": "active"
  }
}
```

### Example 4: Double-Booking Rejection (`POST /hires`)
Attempting to hire Costume 15 to Ravi while Asha holds it:
```json
{
  "actor_name": "Ravi",
  "costume_id": 15
}
```
**Response (`409 Conflict`):**
```json
{
  "error": "Costume 15 is already hired",
  "message": "Costume 15 is already hired"
}
```

### Example 5: Return Costume (`POST /hires/return`)
**Request Body:**
```json
{
  "costume_id": 15
}
```
**Response (`200 OK`):**
```json
{
  "message": "Costume 15 returned successfully.",
  "hire_id": 3,
  "costume_id": 15,
  "return_date": "2026-11-15T14:19:02.930Z",
  "status": "returned"
}
```

## 9. Validation Rules
- **Actor Name:** Required and non-empty. Omission returns `400 Bad Request` with `{ "error": "Validation error: Actor name is required." }`.
- **Costume Name:** Required and non-empty. Omission returns `400 Bad Request` with `{ "error": "Validation error: Costume name is required." }`.
- **Costume Era:** Required and non-empty. Omission returns `400 Bad Request` with `{ "error": "Validation error: Costume era is required." }`.
- **Actor & Costume IDs in Hires:** Both actor and costume must be specified and must exist in the database; non-existent IDs return `404 Not Found`.
- **Invalid Routes:** Any unmatched path returns `404 Not Found` with `{ "error": "Route not found" }`.

## 10. No-Double-Booking Business Rule (Task 5 Twist)
A costume cannot be hired to two active actors at the same time:
1. When an actor attempts to hire a costume via `POST /hires`, the server inspects the `hires` table for existing records where `costume_id = ? AND status = 'active'`.
2. If an active hire exists, the request is immediately rejected with **HTTP 409 Conflict** and the exact dynamic message:
   ```json
   "Costume <costume_id> is already hired"
   ```
3. If no active hire exists, an atomic SQLite transaction (`BEGIN IMMEDIATE`) verifies availability and inserts the hire while transitioning the costume's status to `'rented'`, returning **HTTP 201 Created**.
4. Returning the costume updates the hire record's status to `'returned'` and sets the costume's status back to `'available'`, allowing future bookings.

### Verification of the 3 Required Test Cases:
- **TEST 1:** Hire Costume 15 to Asha &rarr; **HTTP 201 Created**.
- **TEST 2:** Hire Costume 15 to Ravi while Asha has it &rarr; **HTTP 409 Conflict**, message: `"Costume 15 is already hired"`.
- **TEST 3:** Return Costume 15 from Asha &rarr; Hire Costume 15 to Ravi &rarr; **HTTP 201 Created**.

## 11. How to Install Dependencies
Clone or open the project folder in your terminal, then install required npm packages:
```bash
npm install
```

## 12. How to Run the Server & Automated Tests
- **Start Server:**
  ```bash
  npm start
  ```
  The server will listen at `http://localhost:3000`.

- **Run Automated Test Suite:**
  ```bash
  npm test
  ```
  This executes `test.js` to automatically verify CRUD operations, search queries, validations, and the three required double-booking scenarios.

- **Run Programmatic Postman Runner:**
  ```bash
  node run_postman_collection.js
  ```
  Executes all Postman requests and writes the genuine execution report to `Postman_Screenshots/postman_execution_report.txt`.

## 13. How to Test APIs Using Postman
1. Launch **Postman**.
2. Click **Import** (top left).
3. Select or drag-and-drop `CostumeCloset_Postman_Collection.json` from the project directory.
4. Ensure the collection variable `baseUrl` is set to `http://localhost:3000`.
5. Ensure your server is running (`npm start`).
6. Click **Run Collection** or execute individual requests under:
   - **Actors**
   - **Costumes**
   - **Hires**
   - **Double Booking Scenarios (Task 5)**
   - **Validation**
7. All embedded test assertions will run and show green checkmarks.

## 14. Postman Screenshot Evidence Folder (`Postman_Screenshots/`)
The `Postman_Screenshots/` directory is prepared for holding the required 10 PNG screenshots for the assessment submission:

| File | Corresponding Postman Request |
| :--- | :--- |
| `01-get-actors.png` | `GET {{baseUrl}}/actors` (200 OK) |
| `02-add-actor.png` | `POST {{baseUrl}}/actors` (201 Created) |
| `03-get-costumes.png` | `GET {{baseUrl}}/costumes` (200 OK) |
| `04-search-era.png` | `GET {{baseUrl}}/costumes?era=Medieval` (200 OK) |
| `05-add-costume.png` | `POST {{baseUrl}}/costumes` (201 Created) |
| `06-join-hires.png` | `GET {{baseUrl}}/hires` (200 OK with joined actor & costume names) |
| `07-booking-success.png` | `POST {{baseUrl}}/hires` (TEST 1: 201 Created) |
| `08-double-booking-conflict.png` | `POST {{baseUrl}}/hires` (TEST 2: 409 Conflict - "Costume 15 is already hired") |
| `09-return-and-rebook.png` | `POST {{baseUrl}}/hires` (TEST 3: 201 Created after return) |
| `10-validation-error.png` | `POST {{baseUrl}}/costumes` (Validation: 400 Bad Request) |
