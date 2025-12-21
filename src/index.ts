import Server from "./server";
import config from "@config/service.config";

const app = new Server();

app.start(config.serverPort);
