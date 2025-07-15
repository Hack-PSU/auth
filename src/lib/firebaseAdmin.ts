import admin from "firebase-admin";
import { getServiceAccount } from "@/common/config/environment";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
}
export default admin;
