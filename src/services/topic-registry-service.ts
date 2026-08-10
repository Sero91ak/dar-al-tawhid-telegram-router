import type { RoutingCategory } from "../config/routing.js";
import type { TopicRouteRepository } from "../db/repositories/topic-route-repository.js";

export class TopicRegistryService {
  public constructor(private readonly topicRoutes: TopicRouteRepository) {}

  public async register(input: {
    category: RoutingCategory;
    targetForumId: string;
    threadId: number;
    adminUserId: string;
  }): Promise<void> {
    await this.topicRoutes.upsert({
      category: input.category,
      targetForumId: input.targetForumId,
      threadId: input.threadId,
      createdBy: input.adminUserId
    });
  }

  public async unregister(category: RoutingCategory): Promise<void> {
    await this.topicRoutes.remove(category);
  }

  public async resolve(category: RoutingCategory) {
    return this.topicRoutes.find(category);
  }

  public async list() {
    return this.topicRoutes.list();
  }
}
