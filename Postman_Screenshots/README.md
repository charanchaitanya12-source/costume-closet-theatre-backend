# Postman Screenshots Evidence Guide

This folder contains the required screenshot evidence from Postman for the **CostumeCloset Theatre** backend assessment.

The collection `CostumeCloset_Postman_Collection.json` is ready to run in Postman. To take your 10 screenshots for your assessment submission:

1. Start your local server: `npm start`
2. Open the desktop **Postman** application.
3. Import `CostumeCloset_Postman_Collection.json`.
4. Ensure the `baseUrl` variable is set to `http://localhost:3000`.
5. Send each of the 10 requests below and take a screenshot (Windows shortcut: `Win + Shift + S` or `Alt + PrtScn`):

| File Name | Postman Request to Execute | Expected Status Code | Description |
| :--- | :--- | :---: | :--- |
| `01-get-actors.png` | `GET {{baseUrl}}/actors` | **`200 OK`** | Displays full list of actors array. |
| `02-add-actor.png` | `POST {{baseUrl}}/actors` | **`201 Created`** | Creates a new actor (e.g. Laurence Olivier). |
| `03-get-costumes.png` | `GET {{baseUrl}}/costumes` | **`200 OK`** | Displays complete costume inventory list. |
| `04-search-era.png` | `GET {{baseUrl}}/costumes?era=Medieval` | **`200 OK`** | Returns only costumes with `era = Medieval`. |
| `05-add-costume.png` | `POST {{baseUrl}}/costumes` | **`201 Created`** | Adds a new costume with name, era, category, and size. |
| `06-join-hires.png` | `GET {{baseUrl}}/hires` | **`200 OK`** | Shows joined hires with `actor_name` and `costume_name`. |
| `07-booking-success.png` | `POST {{baseUrl}}/hires` (TEST 1) | **`201 Created`** | Booking Costume 15 to Asha. |
| `08-double-booking-conflict.png` | `POST {{baseUrl}}/hires` (TEST 2) | **`409 Conflict`** | Attempting to book Costume 15 to Ravi while active (`"Costume 15 is already hired"`). |
| `09-return-and-rebook.png` | `POST {{baseUrl}}/hires` (TEST 3b) | **`201 Created`** | Re-booking Costume 15 to Ravi after return. |
| `10-validation-error.png` | `POST {{baseUrl}}/costumes` (Validation) | **`400 Bad Request`** | Attempting to create a costume with an empty `era`. |

---
*Note: A complete automated test run of all collection assertions has been verified and saved to `postman_execution_report.txt`.*
