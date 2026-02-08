import dotenv from "dotenv"
dotenv.config({ quiet: true });


const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

export const env = {
  NODE_ENV,
  IS_PROD,
  PORT: process.env.PORT!,
  MONGODB_URI: process.env.MONGODB_URI!,
  JWT_SECRET: process.env.JWT_SECRET!,
}