import { createDatabase } from "../../src/db/index.js";
import { AppStateRepository } from "../../src/db/repositories/app-state-repository.js";
import { ErrorLogRepository } from "../../src/db/repositories/error-log-repository.js";
import { MediaGroupRepository } from "../../src/db/repositories/media-group-repository.js";
import { RoutedMessageRepository } from "../../src/db/repositories/routed-message-repository.js";
import { TopicRouteRepository } from "../../src/db/repositories/topic-route-repository.js";
import { createLogger } from "../../src/services/logger.js";
import { MediaGroupService } from "../../src/services/media-group-service.js";
import { RoutingService } from "../../src/services/routing-service.js";
import { TopicRegistryService } from "../../src/services/topic-registry-service.js";
import { MockTelegramGateway } from "./mock-telegram.js";

export async function createTestContext(mode: "forward" | "copy" = "forward") {
  const logger = createLogger({ LOG_LEVEL: "fatal", NODE_ENV: "test" });
  const database = await createDatabase({ DATABASE_URL: "sqlite::memory:" });
  const topicRoutes = new TopicRouteRepository(database.db);
  const routedMessages = new RoutedMessageRepository(database.db);
  const appState = new AppStateRepository(database.db);
  const errorLog = new ErrorLogRepository(database.db);
  const mediaGroups = new MediaGroupRepository(database.db);
  const telegram = new MockTelegramGateway();
  const topicRegistry = new TopicRegistryService(topicRoutes);
  const mediaGroupService = new MediaGroupService(mediaGroups, logger, { SOURCE_CHANNEL_ID: BigInt(-1001) });
  const routingService = new RoutingService({
    topicRoutes,
    routedMessages,
    appState,
    errorLog,
    telegram,
    logger,
    targetForumId: "-2002",
    routingMode: mode
  });

  return {
    logger,
    database,
    topicRoutes,
    routedMessages,
    appState,
    errorLog,
    mediaGroups,
    telegram,
    topicRegistry,
    mediaGroupService,
    routingService,
    destroy: () => database.destroy()
  };
}
