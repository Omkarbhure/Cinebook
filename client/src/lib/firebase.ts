import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAdexcB40eYVO_9erMzuV8HavfZXmiU7-Q",
  authDomain: "cinebook-c196c.firebaseapp.com",
  projectId: "cinebook-c196c",
  storageBucket: "cinebook-c196c.firebasestorage.app",
  messagingSenderId: "336996666703",
  appId: "1:336996666703:web:b35a7d616df84a8682493a",
  measurementId: "G-37LJ6JQ3RT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
