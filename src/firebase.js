
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCorl8ZcVlYOLzR7UBjwKPCEkGvTB7L4Uw",
  authDomain: "celucontrol-28235.firebaseapp.com",
  databaseURL: "https://celucontrol-28235-default-rtdb.firebaseio.com",
  projectId: "celucontrol-28235",
  storageBucket: "celucontrol-28235.firebasestorage.app",
  messagingSenderId: "357009857422",
  appId: "1:357009857422:web:8067eb9a87dfd5bdade2df"
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
export default app;
