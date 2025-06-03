import { chromium } from "playwright";

import { BASE_URL, makeFlowContext } from "./model";

import type { LoggedInCompletedCtx, LoggedInPreparingCtx, LoginFn, NotLoggedInCtx } from "./model";
import "dotenv/config";

const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const browserWebSocketEndpoint = "ws://127.0.0.1:3000/";

const SELECTORS = {
  emailInput: "#email",
  passwordInput: "#password",
  loginButton: "button[type='submit']"
};

const login: LoginFn = async (page: NotLoggedInCtx): Promise<LoggedInPreparingCtx> => {
  if (!email || !password) {
    throw new Error("Email and password must be provided in environment variables.");
  }

  await page.goto(`${BASE_URL}/user/signin`);
  await page.fill(SELECTORS.emailInput, email);
  await page.fill(SELECTORS.passwordInput, password);
  await page.click(SELECTORS.loginButton);

  return makeFlowContext<"logged-in", "preparing">(page);
};

const captureBooks = async (page: LoggedInPreparingCtx): Promise<[LoggedInCompletedCtx, string[]]> => {
  await page.goto(`${BASE_URL}/mypage/bookshelf`);

  return [makeFlowContext<"logged-in", "completed">(page), []];
};

(async () => {
  try {
    const browser = await chromium.connect(browserWebSocketEndpoint);
    const context = await browser.newContext();
    const newPage = makeFlowContext<"not-logged-in", "preparing">(await context.newPage());

    const loggedInPage = await login(newPage);
    const [completedPage, bookUrls] = await captureBooks(loggedInPage);

    await completedPage.screenshot({ path: "screenshot.png", fullPage: true });

    await browser.close();
  } catch (e) {
    if (e instanceof Error) {
      console.error("An error occurred during the process:", e);
    } else {
      console.error("An unexpected error occurred:", e);
    }
    process.exit(1);
  }
})();
