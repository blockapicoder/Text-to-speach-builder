import "dotenv/config";

import { createApp } from "./app.js";
import { getConfig } from "./config.js";

const config = getConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  console.log(`Voice Forge écoute sur http://localhost:${config.port}`);
  console.log(`Moteur local : ${config.engineUrl}`);
});
