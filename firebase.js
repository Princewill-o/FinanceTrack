// FIREBASE AUTHENTICATION & FIRESTORE DATABASE INITIALIZATION
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// YOUR REAL FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDgPQwzeSYCNNQcFFRbLpzGUcQfJe5mClc",
  authDomain: "financetrack-fb32f.firebaseapp.com",
  projectId: "financetrack-fb32f",
  storageBucket: "financetrack-fb32f.firebasestorage.app",
  messagingSenderId: "564787343657",
  appId: "1:564787343657:web:10243c9aeb52b460d08738",
  measurementId: "G-KDT9BECJX3"
};

let app, auth, db;
let isFirebaseConnected = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isFirebaseConnected = true;
  console.log("Firebase initialized successfully.");
} catch (e) {
  console.warn("Firebase initialization warning (using local fallback engine):", e);
}

// FIREBASE AUTHENTICATION INTERFACE
window.firebaseAuth = {
  // SIGN UP NEW USER
  async signUp(name, email, password) {
    if (!isFirebaseConnected || firebaseConfig.apiKey.includes("DemoKey")) {
      // Graceful fallback to local DB engine if Firebase keys are placeholder
      return window.db.signUp(name, email, password);
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Create initial user document in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name,
      email,
      createdAt: new Date().toISOString(),
      financeData: {
        income: { annualGross: 0, sideHustle: 0, other: 0 },
        expenses: [],
        events: []
      }
    });

    return userCredential.user;
  },

  // SIGN IN USER
  async login(email, password) {
    if (!isFirebaseConnected || firebaseConfig.apiKey.includes("DemoKey")) {
      return window.db.login(email, password);
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // LOGOUT USER
  async logout() {
    if (!isFirebaseConnected || firebaseConfig.apiKey.includes("DemoKey")) {
      return window.db.logout();
    }
    await signOut(auth);
  },

  // SAVE USER FINANCE DATA TO FIRESTORE
  async saveFinanceData(userId, financeData) {
    if (!isFirebaseConnected || firebaseConfig.apiKey.includes("DemoKey")) {
      return window.db.saveUserData(userId, financeData);
    }
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, { financeData }, { merge: true });
  },

  // GET ACTIVE CURRENT USER
  getCurrentUser() {
    if (!isFirebaseConnected || firebaseConfig.apiKey.includes("DemoKey")) {
      return window.db.getCurrentUser();
    }
    const user = auth.currentUser;
    if (user) {
      return {
        userId: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email
      };
    }
    return window.db.getCurrentUser();
  },

  // LISTEN FOR AUTH CHANGES
  onAuthChange(callback) {
    if (!isFirebaseConnected || firebaseConfig.apiKey.includes("DemoKey")) {
      callback(window.db.getCurrentUser());
      return;
    }
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user data from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const data = userDocSnap.exists() ? userDocSnap.data() : null;
        callback({
          userId: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          financeData: data ? data.financeData : null
        });
      } else {
        callback(null);
      }
    });
  }
};
