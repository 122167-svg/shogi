import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoBaeTiuZpkObBdYqzTqcXtgxGmZBvH2g",
  authDomain: "sugamo-shogi-salon.firebaseapp.com",
  projectId: "sugamo-shogi-salon",
  storageBucket: "sugamo-shogi-salon.appspot.com",
  messagingSenderId: "273029914798",
  appId: "1:273029914798:web:c8f571793abab8a1378d3f",
  databaseURL: "https://sugamo-shogi-salon-default-rtdb.firebaseio.com"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get a reference to the database service
export const db = firebase.database();
