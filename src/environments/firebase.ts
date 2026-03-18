import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyA9qr8IzRw0DnDoyBvtyT74DZXPgTw7Hlw",
  authDomain: "pnw-rol-dashboard.firebaseapp.com",
  projectId: "pnw-rol-dashboard",
  storageBucket: "pnw-rol-dashboard.firebasestorage.app",
  messagingSenderId: "765536316863",
  appId: "1:765536316863:web:9a94092e303a84d6aac50a"
};

export const firebaseApp = initializeApp(firebaseConfig);