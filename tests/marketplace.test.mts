import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CancelRewardRedemptionSchema,
  CreateMarketplaceRewardSchema,
  RequestRewardRedemptionSchema,
  ReviewRewardRedemptionSchema,
} from "../packages/contracts/src/index.ts";
import {
  canRedeemReward,
  getRewardAvailability,
  getRewardMaxAffordableQuantity,
} from "../packages/marketplace/src/items.ts";
import {
  canCancelRedemption,
  canReviewRedemption,
  getRedemptionStatusLabel,
} from "../packages/marketplace/src/redemption.ts";
import {
  canFulfillRedemption,
  isRedemptionClosed,
} from "../packages/marketplace/src/fulfillment.ts";

const migrationUrl = new URL(
  "../supabase/migrations/20260821172810_reward_redemption_marketplace.sql",
  import.meta.url,
);
const memberActionsUrl = new URL(
  "../apps/gdg-hub/app/member/rewards/actions.ts",
  import.meta.url,
);
const adminProductActionsUrl = new URL(
  "../apps/gdg-hub/app/admin/products/actions.ts",
  import.meta.url,
);
const adminRedemptionActionsUrl = new URL(
  "../apps/gdg-hub/app/admin/rewards/actions.ts",
  import.meta.url,
);
const legacyRouteUrl = new URL(
  "../apps/gdg-hub/app/api/redemptions/create/route.ts",
  import.meta.url,
);

test("validates reward catalog and redemption inputs", () => {
  const reward = CreateMarketplaceRewardSchema.parse({
    slug: "gdg-shirt",
    name: "GDG Shirt",
    description: "Community shirt",
    imageUrl: "https://example.com/shirt.png",
    pointCost: "250",
    stockQuantity: "12",
    active: true,
    sortOrder: "1",
  });

  assert.equal(reward.pointCost, 250);
  assert.equal(reward.stockQuantity, 12);
  assert.equal(
    CreateMarketplaceRewardSchema.safeParse({
      ...reward,
      slug: "Bad Slug",
    }).success,
    false,
  );
  assert.equal(
    RequestRewardRedemptionSchema.safeParse({
      rewardId: "00000000-0000-4000-8000-000000000001",
      quantity: 0,
      operationKey: "a1150000-0000-4000-8000-000000000001",
    }).success,
    false,
  );
  assert.equal(
    CancelRewardRedemptionSchema.safeParse({
      redemptionId: "00000000-0000-4000-8000-000000000001",
      reason: "x",
      operationKey: "a1150000-0000-4000-8000-000000000001",
    }).success,
    false,
  );
  assert.equal(
    ReviewRewardRedemptionSchema.safeParse({
      redemptionId: "00000000-0000-4000-8000-000000000001",
      decision: "REJECT",
      reason: "",
      operationKey: "a1150000-0000-4000-8000-000000000001",
    }).success,
    false,
  );
});

test("applies catalog availability and lifecycle rules", () => {
  const activeReward = { active: true, point_cost: 100, stock_quantity: 4 };

  assert.equal(getRewardAvailability(activeReward), "AVAILABLE");
  assert.equal(
    getRewardAvailability({ ...activeReward, stock_quantity: 0 }),
    "SOLD_OUT",
  );
  assert.equal(getRewardMaxAffordableQuantity(250, 100, 4), 2);
  assert.equal(canRedeemReward(250, activeReward, 2), true);
  assert.equal(canRedeemReward(199, activeReward, 2), false);
  assert.equal(getRedemptionStatusLabel("PENDING"), "Pending review");
  assert.equal(canCancelRedemption("PENDING"), true);
  assert.equal(canReviewRedemption("APPROVED"), false);
  assert.equal(canFulfillRedemption("APPROVED"), true);
  assert.equal(isRedemptionClosed("FULFILLED"), true);
});

test("keeps marketplace inventory, ledger, audit, and status writes atomic", async () => {
  const [migration, memberActions, productActions, redemptionActions] =
    await Promise.all([
      readFile(migrationUrl, "utf8"),
      readFile(memberActionsUrl, "utf8"),
      readFile(adminProductActionsUrl, "utf8"),
      readFile(adminRedemptionActionsUrl, "utf8"),
    ]);

  assert.match(migration, /private\.request_reward_redemption/);
  assert.match(migration, /private\.cancel_reward_redemption/);
  assert.match(migration, /private\.review_reward_redemption/);
  assert.match(migration, /private\.fulfill_reward_redemption/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /MARKETPLACE_REDEMPTION/);
  assert.match(migration, /MARKETPLACE_REFUND/);
  assert.match(migration, /stock_quantity = stock_quantity - p_quantity/);
  assert.match(
    migration,
    /stock_quantity = stock_quantity \+ redemption_row\.quantity/,
  );
  assert.match(migration, /redemption_status_history_operation_key_key/);
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.redemptions\s+FROM PUBLIC, anon, authenticated, service_role/,
  );
  assert.doesNotMatch(migration, /event_attendance/);

  for (const action of [memberActions, productActions, redemptionActions]) {
    assert.match(action, /"use server"/);
    assert.match(action, /getActive(Member|Admin)/);
    assert.match(action, /revalidatePath/);
  }

  await assert.rejects(readFile(legacyRouteUrl, "utf8"), { code: "ENOENT" });
});
