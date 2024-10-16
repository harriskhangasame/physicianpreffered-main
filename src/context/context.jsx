import { createContext, useState, useContext, useEffect } from "react";
import { auth, provider } from '../lib/firebase'; // Ensure correct import path for Firebase setup
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";

const AddContext = createContext();

export function useLocalContext() {
    return useContext(AddContext);
}

export function ContextProvider({ children }) {
    const [user, setUser] = useState(null);

    // Function for Google login
    const login = () => {
        signInWithPopup(auth, provider)
            .then((result) => {
                setUser(result.user); // Set the user after successful login
            })
            .catch((error) => {
                console.error("Login error:", error);
            });
    };

    // Monitor authentication state to persist user login across sessions
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser); // Update user state when auth state changes
        });

        // Clean up the listener on component unmount
        return () => unsubscribe();
    }, []);

    const value = { 
        user, 
        setUser, 
        login
    };

    return <AddContext.Provider value={value}>{children}</AddContext.Provider>;
}
