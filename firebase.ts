import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDP133txLGziJ6sBqgtYoqsVlzl6RrVj84",
  authDomain: "my-finintel-india-9997.firebaseapp.com",
  projectId: "my-finintel-india-9997",
  storageBucket: "my-finintel-india-9997.firebasestorage.app",
  messagingSenderId: "51192093859",
  appId: "1:51192093859:web:891086a10b31b4c4627316",
  measurementId: "G-12TDGRSLZM"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
