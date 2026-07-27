import { app } from './app/app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
