import "dotenv/config";
import { mkdirSync } from "fs";
import path from "path";

import { chromium } from "playwright";

import { writeCsvFile, BOOK_CSV_MAPPERS } from "./csv";
import { BASE_URL, makeFlowContext } from "./model";

import type {
  BookItem,
  BookMap,
  LoggedInCompletedCtx,
  LoggedInContinuingCtx,
  LoggedInPreparingCtx,
  LoginFn,
  NotLoggedInCtx
} from "./model";
import type { BookShelfItemDetailQueryResponse, BookShelfQueryResponse, DatabaseId } from "./responseSchema";
import type { Page } from "playwright";

const savePath = "./downloads/";
const csvFileName = "book_list.csv";

const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const useDockerBrowser = process.env.USE_DOCKER_BROWSER;
const forceDownloadBooks = process.env.FORCE_DOWNLOAD_BOOKS;

if (!email || !password || useDockerBrowser === undefined || forceDownloadBooks === undefined) {
  throw new Error("Environment variables EMAIL, PASSWORD, USE_DOCKER_BROWSER, and FORCE_DOWNLOAD_BOOKS must be set.");
}
if (useDockerBrowser !== "0" && useDockerBrowser !== "1") {
  throw new Error("Environment variable USE_DOCKER_BROWSER must be '0 (false)' or '1 (true)'.");
}
if (forceDownloadBooks !== "0" && forceDownloadBooks !== "1") {
  throw new Error("Environment variable FORCE_DOWNLOAD_BOOKS must be '0 (false)' or '1 (true)'.");
}
if (useDockerBrowser === "1") {
  console.log("Using Docker browser for headless operation.");
}
if (useDockerBrowser === "0") {
  console.log("Using local browser for interactive operation.");
}

const browserWebSocketEndpoint = "ws://127.0.0.1:3000/";
const SELECTORS = {
  emailInput: "#email",
  passwordInput: "#password",
  loginButton: "button[type='submit']"
};
const XPATH = {
  allBooks: "//div/div/div/div/div/div/div[2]/div/div[1]/div[2]/div/div[*]/div/div/button"
};

/**
 * lazy loading workaround for Playwright
 * https://www.mrskiro.dev/posts/playwright-for-lazy-loading
 */
const scrollToBottom = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    // ugly hack to avoid esbuild bug...
    // ref: https://github.com/evanw/esbuild/issues/2605
    (window as any).__name = (func: Function) => func;

    const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    // scroll to bottom
    for (let i = 0; i < document.body.scrollHeight; i += 100) {
      window.scrollTo(0, i);
      await delay(50);
    }
    // scroll to top
    for (let i = document.body.scrollHeight; i > 0; i -= 100) {
      window.scrollTo(0, i);
      await delay(50);
    }
  });
};

const login: LoginFn = async (page: NotLoggedInCtx): Promise<LoggedInPreparingCtx> => {
  await page.goto(`${BASE_URL}/user/signin`);
  await page.fill(SELECTORS.emailInput, email);
  await page.fill(SELECTORS.passwordInput, password);
  await page.click(SELECTORS.loginButton);
  await page.waitForURL(`${BASE_URL}/mypage`);

  return makeFlowContext<"logged-in", "preparing">(page);
};

const getTotalNumberOfBooks = async (page: LoggedInPreparingCtx): Promise<[LoggedInContinuingCtx, number]> => {
  const bookIds = [];

  page.on("response", (response) => {
    if (response.url().includes("operationName=BookShelfQuery")) {
      (async () => {
        const json: BookShelfQueryResponse = await response.json();
        if (json.data?.viewer?.bookShelfItems?.edges.length !== 0) {
          const bookEdges = json.data.viewer.bookShelfItems.edges;
          for (const edge of bookEdges) {
            const databaseId = edge.node.product.databaseID;
            bookIds.push(databaseId);
          }
        }
      })();
    }
  });

  const loadedPromise = page.waitForResponse(
    (response) => response.url().includes("/api/image/") && response.status() === 200
  );
  await page.goto(`${BASE_URL}/mypage/bookshelf`);
  await loadedPromise;

  await scrollToBottom(page);

  return [makeFlowContext<"logged-in", "continuing">(page), bookIds.length];
};

const captureBooks = async (page: LoggedInContinuingCtx): Promise<[LoggedInCompletedCtx, BookMap]> => {
  const bookMap: BookMap = new Map<DatabaseId, BookItem>();
  await page.goto(`${BASE_URL}/mypage/bookshelf`);

  await scrollToBottom(page);

  const allBookLocators = page.locator(XPATH.allBooks);
  await allBookLocators.last().waitFor();

  for (const loc of (await allBookLocators.all()).reverse()) {
    await loc.click();

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("operationName=BookShelfItemDetailQuery")
    );

    const response = await responsePromise;
    const json: BookShelfItemDetailQueryResponse = await response.json();

    if (json.data?.node?.product?.downloadContent) {
      const book = json.data.node;
      const databaseId = book.product.databaseID;
      console.log(`${book.product.name} by ${book.product.organization.name}`);

      const downloadPromise = page.waitForEvent("download");
      await page.getByText("ダウンロード").click();
      const download = await downloadPromise;

      // Construct filename with databaseId prefix
      const originalFilename = download.suggestedFilename();
      const filenameWithDatabaseId = `${databaseId}_${originalFilename}`;
      const downloadPath = path.join(savePath, filenameWithDatabaseId);

      await download.saveAs(downloadPath);
      console.log(`Downloaded: ${downloadPath}`);

      const bookItem: BookItem = {
        id: databaseId,
        title: book.product.name,
        organizationName: book.product.organization.name,
        causedAt: book.causedAt,
        fileName: filenameWithDatabaseId
      };
      bookMap.set(databaseId, bookItem);
    } else {
      console.log(`Skipping book without download content`);
    }

    await loc.press("Escape");
  }

  return [makeFlowContext<"logged-in", "completed">(page), bookMap];
};

(async () => {
  try {
    mkdirSync(savePath, { recursive: true });

    const browser =
      useDockerBrowser == "1"
        ? await chromium.connect(browserWebSocketEndpoint)
        : await chromium.launch({
            slowMo: 100,
            headless: false,
            args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu-sandbox"],
            channel: "chrome"
          });
    const context = await browser.newContext();
    const page = makeFlowContext<"not-logged-in", "preparing">(await context.newPage());

    const loggedInPage = await login(page);
    const [, bookNumber] = await getTotalNumberOfBooks(loggedInPage);
    console.log(`Total books detected: ${bookNumber}`);

    const continuingPage = makeFlowContext<"logged-in", "continuing">(await context.newPage());
    const [, bookMap] = await captureBooks(continuingPage);
    console.log(`Total books captured: ${bookMap.size}`);

    if (bookNumber !== bookMap.size) {
      throw new Error(
        `Mismatch in book count: expected ${bookNumber}, but captured ${bookMap.size}. Run the script again.`
      );
    }

    const bookItems = Array.from(bookMap.values());
    const csvFilePath = path.join(savePath, csvFileName);
    await writeCsvFile(csvFilePath, bookItems, BOOK_CSV_MAPPERS);
    console.log(`CSV file exported: ${csvFilePath}`);

    await context.close();
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
