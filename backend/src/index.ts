import "dotenv/config";
import { app } from "./app";
import { whatsAppService } from "./modules/whatsapp/whatsapp.service";
import { startWhatsAppScheduler } from "./modules/whatsapp/whatsapp-scheduler";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Pegasus Manager API running on port ${PORT}`);
  startWhatsAppScheduler();
});
