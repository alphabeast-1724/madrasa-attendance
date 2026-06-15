import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { getRouter } from "./router";

const router = getRouter();

const StartClientAny = StartClient as any;

hydrateRoot(document, <StartClientAny router={router} />);
