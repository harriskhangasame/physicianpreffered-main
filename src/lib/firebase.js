import { initializeApp } from "firebase/app";
import {getFirestore} from 'firebase/firestore';
import {getAuth, GoogleAuthProvider} from 'firebase/auth';
import {getStorage} from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDqUFpl2X8h75zvR8bWopeGYUj4lXUARQM",
    authDomain: "physicianspreffered.firebaseapp.com",
    projectId: "physicianspreffered",
    storageBucket: "physicianspreffered.appspot.com",
    messagingSenderId: "497024101220",
    appId: "1:497024101220:web:a3010c24eb94ceba256871",
    measurementId: "G-TR1WTW0NYD"
};

const app = initializeApp(firebaseConfig);
const db= getFirestore(app);
const auth= getAuth(app)
const provider = new GoogleAuthProvider(); 
const storage = getStorage(app);

export {auth,provider,storage};
export default db;