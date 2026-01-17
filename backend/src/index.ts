import { createApp } from './app.js';
import { env, testConnection } from './config/index.js';

async function main() {
  try {
    // Test database connection
    await testConnection();

    // Create and start server
    const app = createApp();

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
