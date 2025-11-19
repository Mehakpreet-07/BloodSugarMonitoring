# Online Blood Sugar Monitoring System

## Project Overview
This is a locally hosted web application designed to help diabetic patients track their blood sugar levels and assist healthcare specialists in monitoring patient data. The system detects patterns in glucose readings using a rule-based algorithm and generates alerts for abnormal trends.

**Course:** INFO 2413 (Fall 2025)
**Team:** Aanchman, Bhavni, Kripa, Mehak, Rahul

## Tech Stack
* **Backend:** Node.js (Core modules only: `http`, `fs`, `crypto`, `path`). No Express or Frameworks used.
* **Frontend:** Vanilla JavaScript, HTML5, CSS3.
* **Database:** JSON file-based storage system with atomic write operations.
* **Security:** Scrypt password hashing, CSRF protection, and RBAC (Role-Based Access Control).

## Setup & Installation

1.  **Prerequisites**
    Ensure Node.js (v18 or higher) is installed.

2.  **Install Dependencies**
    This project has zero runtime dependencies except for email functionality.
    ```bash
    npm install
    ```

3.  **Initialize Data**
    Before running the app, you must seed the database to create the necessary JSON files and default users.
    ```bash
    node scripts/seed-data.js
    ```

4.  **Start the Server**
    ```bash
    node server/server.js
    ```
    The application will run at: `http://localhost:3000`

## Login Credentials (Test Accounts)
All accounts use the password: `demo`

* **Patient:** `patient@demo.test` (Standard mg/dL unit)
* **Patient:** `bhavni@demo.test` (mmol/L unit)
* **Specialist:** `dr@demo.test`
* **Admin:** `admin@demo.test`

## Key Features Implemented
* **Data Entry:** Patients can log readings with timestamps and notes.
* **Unit Conversion:** Automatic conversion between mg/dL and mmol/L based on user preference ($1 \text{ mmol/L} = 18 \text{ mg/dL}$).
* **Alert System:** Automatically flags "Abnormal" readings. If a patient records >3 abnormal readings in a week, a pending alert is generated for the specialist.
* **AI Insights:** Analyzes recent logs to find correlations between specific foods (e.g., "fast food") and high glucose spikes.
* **Security:** Enforces session timeouts, role boundaries (Patients cannot see other patients), and input validation.

## Known Limitations
* **Email Notifications:** The system logs email attempts to the console. In a production environment, this would connect to a real SMTP server. Connection errors in the console are expected in this local environment.