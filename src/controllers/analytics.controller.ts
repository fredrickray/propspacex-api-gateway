import { Request, Response } from "express";
import { propertyService, userService } from "../grpc-clients";
import { handleGrpcError } from "@utils/handleGrpcError";

const DEAL_SOURCES = ["website", "referral", "social", "portal"] as const;

function lastSixMonthKeys(now = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    keys.push(`${date.getUTCFullYear()}-${month}`);
  }
  return keys;
}

function asNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export default class AnalyticsController {
  async getAgentAnalytics(req: Request, res: Response) {
    try {
      const agentId = req.user?.userId;
      if (!agentId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const [views, deals] = await Promise.all([
        propertyService.getAgentViewStats(agentId),
        userService.getAgentDealStats(agentId),
      ]);

      const viewsByMonth = new Map(
        (views.months || []).map((row) => [row.month, asNumber(row.views)])
      );
      const leadsByMonth = new Map(
        (deals.months || []).map((row) => [row.month, asNumber(row.leads)])
      );
      const leadsByProperty = new Map(
        (deals.propertyLeads || []).map((row) => [row.propertyId, asNumber(row.leads)])
      );
      const countsBySource = new Map(
        (deals.sources || []).map((row) => [row.source, asNumber(row.count)])
      );

      return res.status(200).json({
        success: true,
        views: asNumber(views.views),
        viewsLastMonth: asNumber(views.viewsLastMonth),
        leads: asNumber(deals.leads),
        leadsLastMonth: asNumber(deals.leadsLastMonth),
        activeListings: asNumber(views.activeListings),
        listingsCreatedThisMonth: asNumber(views.listingsCreatedThisMonth),
        months: lastSixMonthKeys().map((month) => ({
          month,
          views: viewsByMonth.get(month) || 0,
          leads: leadsByMonth.get(month) || 0,
        })),
        sources: DEAL_SOURCES.map((source) => ({
          source,
          count: countsBySource.get(source) || 0,
        })),
        topProperties: (views.topProperties || []).slice(0, 5).map((row) => ({
          propertyId: row.propertyId || "",
          title: row.title || "",
          views: asNumber(row.views),
          leads: leadsByProperty.get(row.propertyId) || 0,
        })),
      });
    } catch (error) {
      return handleGrpcError(res, error, "Failed to load analytics", "Analytics");
    }
  }
}
