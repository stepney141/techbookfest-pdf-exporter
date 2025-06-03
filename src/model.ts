import type { DatabaseId } from "./responseSchema";
import type { Page } from "playwright";

export const BASE_URL = "https://techbookfest.org";

export type LoginState = "logged-in" | "not-logged-in";
export type PaginationState = "preparing" | "continuing" | "completed";
export type FlowContext<L extends LoginState, P extends PaginationState> = Page & {
  __brand: {
    login: L;
    pagination: P;
  };
};

export type NotLoggedInCtx = FlowContext<"not-logged-in", "preparing">;
export type LoggedInPreparingCtx = FlowContext<"logged-in", "preparing">;
export type LoggedInContinuingCtx = FlowContext<"logged-in", "continuing">;
export type LoggedInCompletedCtx = FlowContext<"logged-in", "completed">;

export type LoginFn = (page: NotLoggedInCtx) => Promise<LoggedInPreparingCtx>;
export type FetchBooksFn = (
  page: LoggedInPreparingCtx | LoggedInContinuingCtx
) => Promise<LoggedInContinuingCtx | LoggedInCompletedCtx>;

export const makeFlowContext = <L extends LoginState, P extends PaginationState>(page: Page): FlowContext<L, P> =>
  page as FlowContext<L, P>;

export type BookItem = {
  id: DatabaseId;
  title: string; // 書名
  organizationName: string; // サークル名
  causedAt: string; // 購入日時
  fileName: string; // DLCファイル名
};
export type BookMap = Map<DatabaseId, BookItem>;
