import { auth } from "@backend/convex/auth";
import { httpRouter } from "convex/server";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
