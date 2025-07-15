import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getEnvironment } from "./environment";

const env = getEnvironment();

const firebaseApp = initializeApp(env);
export const auth = getAuth(firebaseApp);
