# College Coding Collaboration MVP

This project is an MVP of a real-time coding collaboration platform.
The architecture utilizes a React + Vite + Tailwind frontend and a PHP/MongoDB backend.

## Architecture & Structure
- `/frontend/`: Contains the React project. Beautiful UI leveraging Tailwind CSS, `lucide-react` for icons, and `react-router-dom` for navigation. Includes Dashboard, Realtime Code Editor + Chat, and dynamic User Profile.
- `/backend/`: Contains the PHP backend code. Includes mock databases and `composer.json` to link the `mongodb/mongodb` connector.

## How to Run

### Frontend (React & Vite)
1. Ensure you have Node.js installed.
2. Open a terminal and navigate to the frontend directory:
   `cd frontend`
3. Install the dependencies (if you haven't already):
   `npm install`
4. Start the frontend development server:
   `npm run dev`

### Backend (PHP + MongoDB)
1. Ensure you have PHP installed and MongoDB running locally on `localhost:27017`.
2. Ensure you have `composer` installed. Navigate to the backend folder:
   `cd backend`
3. Install PHP dependencies:
   `composer install`
4. Serve the PHP content via the built-in server or Apache (XAMPP).
   `php -S localhost:8000`

## Features Included in Design
1. **Dynamic Login & Regsitration:** Mocked auth flow with an attractive UI.
2. **Dashboard:** Includes search bar and separates public projects (by likes) and your own projects.
3. **Editor:** A dual-pane workspace with a code area mapped to terminal outputs and a collapsible realtime chat on the right side.
4. **Public Profile:** Shows user ranks, project counts, total likes recieved, and recent creations.
