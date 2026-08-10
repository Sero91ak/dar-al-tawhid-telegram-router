import type { Kysely } from "kysely";
import type { RoutingCategory } from "../../config/routing.js";
import type { TopicRouteRecord } from "../../types/domain.js";
import type { DatabaseSchema } from "../schema.js";

export class TopicRouteRepository {
  public constructor(private readonly db: Kysely<DatabaseSchema>) {}

  public async upsert(input: {
    category: RoutingCategory;
    targetForumId: string;
    threadId: number;
    createdBy: string;
  }): Promise<void> {
    await this.db
      .insertInto("topic_routes")
      .values({
        category: input.category,
        target_forum_id: input.targetForumId,
        thread_id: input.threadId,
        created_by: input.createdBy
      })
      .onConflict((oc) =>
        oc.column("category").doUpdateSet({
          target_forum_id: input.targetForumId,
          thread_id: input.threadId,
          created_by: input.createdBy,
          updated_at: new Date().toISOString()
        })
      )
      .execute();
  }

  public async remove(category: RoutingCategory): Promise<void> {
    await this.db.deleteFrom("topic_routes").where("category", "=", category).execute();
  }

  public async find(category: RoutingCategory): Promise<TopicRouteRecord | null> {
    const row = await this.db.selectFrom("topic_routes").selectAll().where("category", "=", category).executeTakeFirst();
    return row ? mapRow(row) : null;
  }

  public async list(): Promise<TopicRouteRecord[]> {
    const rows = await this.db.selectFrom("topic_routes").selectAll().orderBy("category").execute();
    return rows.map(mapRow);
  }
}

function mapRow(row: {
  category: RoutingCategory;
  target_forum_id: string;
  thread_id: number;
  created_by: string;
  updated_at: string;
}): TopicRouteRecord {
  return {
    category: row.category,
    threadId: row.thread_id,
    targetForumId: row.target_forum_id,
    createdBy: row.created_by,
    updatedAt: row.updated_at
  };
}
