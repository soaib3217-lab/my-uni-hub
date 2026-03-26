# 🎓 My Uni Hub

<div align="center">
  <p><strong>A centralized, web-based platform for managing, storing, and organizing university notes and academic resources.</strong></p>
</div>

![Project Banner](./assets/banner.png)

---

## 📖 1. Project Description
My Uni Hub is a unified digital workspace designed specifically for university students to streamline their academic lives. It eliminates the chaos of scattered PDFs, lost lecture slides, and fragmented study materials by providing a single, organized hub. By integrating real-time database capabilities with secure cloud storage and AI-powered features, the application ensures that study materials are always categorized, searchable, and accessible from any device.

## 🤔 2. Why Do Students Need This?
Juggling heavy coursework—like complex statistics modules, math proofs, or programming labs—means dealing with an endless stream of reference books, lecture notes, and assignments.

* **The Problem:** Students typically have materials scattered across WhatsApp groups, Google Classroom, local hard drives, and physical notebooks. Finding a specific lecture slide right before an exam is a stressful, time-consuming task.
* **The Solution:** My Uni Hub acts as a personal academic search engine and filing cabinet. It saves time, reduces pre-exam panic, and ensures that every piece of knowledge is exactly where it belongs.

## ✨ 3. Key Features
* **Seamless File Management:** Upload, download, and organize lecture notes, assignments, and reference materials into subject-specific folders.
* **Smart Search & Retrieval:** Instantly locate specific study materials using built-in search functionality.
* **Real-Time Synchronization:** Instant updates across all devices powered by a real-time database.
* **AI Integration:** Integrated with the Gemini API to provide smart study assistance and contextual help.
* **Responsive UI/UX:** A clean, accessible design built for ease of use across both desktop and mobile devices.
* **Secure Cloud Storage:** Reliable backend architecture connecting directly to Google Drive for secure document hosting.

## 💰 4. Zero-Cost Architecture (Free Domain & Hosting)
A major goal of this project was to build a robust, production-ready application without incurring monthly server or storage costs. This was achieved through:

* **Hosting & Domain:** Deployed using Supabase Hosting (or Vercel/Netlify), which provides a free, fast, global CDN and a secure `.app` or `.vercel.app` subdomain.
* **Database:** Supabase free tier acts as the real-time PostgreSQL backend, providing more than enough bandwidth and storage for user data and authentication.
* **File Storage:** Instead of paying for AWS S3, the app creatively leverages the Google Drive API and Google Apps Script to use free Google accounts as a limitless, zero-cost cloud storage bucket for large PDF and Word files.

## 🛠️ 5. Tools & Technologies Used
* **Frontend:** React.js / Next.js, HTML5, CSS3, JavaScript (ES6+)
* **Backend / Database:** Supabase (PostgreSQL & Realtime capabilities)
* **Storage Architecture:** Google Drive API & Google Apps Script
* **AI Integration:** Google Gemini API
* **Version Control:** Git & GitHub

## 🏗️ 6. How I Built It
* **Planning & UI:** Started by mapping out the user journey—how a student would log in, create a subject folder, and upload a file.
* **Database Schema:** Set up Supabase to handle user authentication and structured the PostgreSQL tables to link users to their specific files and folders.
* **Storage Integration:** Wrote a Google Apps Script to act as a bridge between the frontend and Google Drive, allowing secure file uploads without exposing sensitive Drive credentials.
* **Frontend Development:** Built the React components, ensuring state management handled file uploads smoothly and displayed real-time loading indicators.
* **AI Integration:** Hooked up the Gemini API to add smart features and enhance the overall study experience.

## 🚧 7. Challenges Faced & How I Solved Them
* **Handling File Uploads to Google Drive:** Bypassing CORS issues and managing large binary file transfers from the browser to Google Drive was tricky. **Solution:** I utilized Google Apps Script as an intermediary webhook to process the base64 encoded files and save them securely to Drive.
* **State Synchronization:** Ensuring the UI immediately reflected newly uploaded files without requiring a page refresh. **Solution:** Leveraged Supabase's real-time subscriptions to automatically push database changes to the React frontend.
* **Securing Environment Variables:** Managing API keys for Gemini, Supabase, and Google Scripts safely. **Solution:** Implemented strict `.env` configurations and utilized environment variables within the hosting platform to keep secrets out of the source code.

## 🚀 8. Getting Started
To get a local copy up and running, follow these simple steps:

### Prerequisites
Node.js and npm installed on your machine.
```bash
npm install npm@latest -g
```

### Installation
1.  **Clone the repo:**
    ```bash
    git clone https://github.com/soaib3217-lab/my-uni-hub.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd my-uni-hub
    ```
3.  **Install NPM packages:**
    ```bash
    npm install
    ```
4.  **Set up your environment variables:** Create a `.env` file in the root directory and add your configuration:
    ```env
    ADMIN_SECRET_PASSWORD=your_password
    GEMINI_API_KEY=your_gemini_api_key
    NEXT_PUBLIC_GOOGLE_SCRIPT_URL=your_google_script_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    ```
5.  **Start the development server:**
    ```bash
    npm start
    ```

## 💡 9. Usage
Once the application is running, create an account to access your dashboard. From there, you can:
* Create new folders for your current semester's courses.
* Upload PDF/Word notes directly into those folders.
* Utilize the search bar to instantly pull up specific topics or files.
* Access your materials on-the-go from your mobile browser.

## 👨‍💻 10. Author
**MD. MUNIF HOSSAIN**

* **LinkedIn:** [md-munif-hossain](https://www.linkedin.com/in/md-munif-hossain)
* **Portfolio:** [Insert Your Portfolio URL Here]

## 📝 11. License
Distributed under the MIT License. See `LICENSE` for more information.
