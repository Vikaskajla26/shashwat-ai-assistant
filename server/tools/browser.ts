import path from "path";
import os from "os";

/**
 * Real browser automation via Playwright (Chromium), with a persistent
 * user-data-dir so cookies/sessions survive across runs — the "autonomous
 * sandbox workspace". Playwright is imported lazily so the server can boot
 * even if it isn't installed yet (a clear error is returned per action).
 */

const PROFILE_DIR = path.join(os.homedir(), ".shaashvat-browser");

let ctxPromise: Promise<any> | null = null;
let playwrightMissingReported = false;

async function loadPlaywright(): Promise<any> {
  try {
    return await import("playwright");
  } catch {
    if (!playwrightMissingReported) {
      console.warn(
        "[browser] Playwright is not installed. Run: npm install playwright && npx playwright install chromium"
      );
      playwrightMissingReported = true;
    }
    return null;
  }
}

async function getContext(): Promise<any> {
  if (ctxPromise) return ctxPromise;
  ctxPromise = (async () => {
    const pw = await loadPlaywright();
    if (!pw) {
      throw new Error(
        "Playwright is not installed. Run `npm install playwright` then `npx playwright install chromium` to enable browser automation."
      );
    }
    const fs = await import("fs");
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    const ctx = await pw.chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      args: ["--start-maximized"],
    });
    ctx.on("page", (page: any) => {
      page.setDefaultTimeout(20000);
    });
    return ctx;
  })();
  return ctxPromise;
}

async function currentPage(ctx: any): Promise<any> {
  const pages = ctx.pages();
  if (pages.length === 0) return await ctx.newPage();
  return pages[pages.length - 1];
}

export interface BrowserArgs {
  action?: string;
  target?: string;
  details?: string;
}

export async function browserNavigate(
  args: BrowserArgs
): Promise<{ executed: boolean; action: string; target: string; message: string; data?: any }> {
  const action = String(args.action || "read_page").toLowerCase();
  const target = String(args.target || "");

  let ctx: any;
  try {
    ctx = await getContext();
  } catch (e: any) {
    return {
      executed: false,
      action,
      target,
      message: `Browser automation unavailable: ${e?.message || e}`,
    };
  }

  try {
    switch (action) {
      case "navigate": {
        const url = normalizeUrl(target);
        let page = await currentPage(ctx);
        await page.goto(url, { waitUntil: "domcontentloaded" });
        return { executed: true, action, target: url, message: `Navigated to ${url}.` };
      }
      case "read_page":
      case "summarize_page": {
        const page = await currentPage(ctx);
        const url = page.url();
        const title = await page.title().catch(() => "");
        const text = await extractMainText(page);
        const trimmed = text.slice(0, 4000);
        return {
          executed: true,
          action,
          target: target || url,
          message: `Read "${title}" (${text.length} chars).`,
          data: { url, title, text: trimmed },
        };
      }
      case "click": {
        const page = await currentPage(ctx);
        const sel = toSelector(target);
        await page.click(sel, { timeout: 8000 }).catch(() => null);
        // Fallback: a11y/role based click by visible text
        if (!sel) {
          await page.getByText(target, { exact: false }).first().click({ timeout: 8000 }).catch(() => null);
        }
        return { executed: true, action, target, message: `Attempted click on "${target}".` };
      }
      case "scroll": {
        const page = await currentPage(ctx);
        const amt = parseScroll(args.details);
        await page.mouse.wheel(0, amt);
        return { executed: true, action, target, message: `Scrolled ${amt > 0 ? "down" : "up"} by ${Math.abs(amt)}px.` };
      }
      case "fill_form": {
        const page = await currentPage(ctx);
        // details format: "selector=>value; selector=>value"
        const pairs = String(args.details || "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.split("=>"));
        for (const [sel, value] of pairs) {
          if (!sel || !value) continue;
          await page.fill(sel.trim(), value.trim()).catch(() => null);
        }
        return { executed: true, action, target, message: `Filled ${pairs.length} field(s).` };
      }
      case "switch_tab": {
        const pages = ctx.pages();
        if (/^\d+$/.test(target)) {
          const idx = parseInt(target, 10) - 1;
          if (pages[idx]) {
            await pages[idx].bringToFront();
            return { executed: true, action, target, message: `Switched to tab #${target}.` };
          }
        }
        return { executed: false, action, target, message: `Tab #${target} not found.` };
      }
      case "close_tab": {
        const pages = ctx.pages();
        if (pages.length > 1) {
          await pages[pages.length - 1].close();
          return { executed: true, action, target, message: "Closed the active tab." };
        }
        return { executed: false, action, target, message: "Only one tab open; not closing." };
      }
      case "research_topic":
      case "compare_products": {
        // Open a Google search in Playwright Chromium, extract Direct Answer Box + Results + Snippets
        const page = await currentPage(ctx);
        const q = target || args.details || "";
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(q)}`, {
          waitUntil: "domcontentloaded",
        });

        // Wait for Google SERP JS elements to settle
        await page.waitForTimeout(1000).catch(() => null);

        const pageData = await page
          .evaluate(() => {
            // Direct Answer / Knowledge Panel Box
            const directAnswerEl = document.querySelector(".Z0LcW, .hgKElc, .OSrRJf, .IZ65fc, .vk_bk, .VwiC3b, [data-attrid]");
            const directAnswer = directAnswerEl ? directAnswerEl.textContent?.trim() : "";

            // Result Blocks
            const blocks = Array.from(document.querySelectorAll("div.g, div[data-sokod]"));
            const results = blocks.slice(0, 8).map((b) => {
              const h3 = b.querySelector("h3");
              const a = b.querySelector("a");
              const snippetEl = b.querySelector(".VwiC3b, .yXMda, .qVZrWe, .s3rec");
              return {
                title: (h3?.textContent || "").trim(),
                url: a?.href || "",
                snippet: (snippetEl?.textContent || "").trim(),
              };
            }).filter((r) => r.title.length > 0);

            // Full visible page text fallback
            const bodyText = (document.body.innerText || "").slice(0, 1500);

            return { directAnswer, results, bodyText };
          })
          .catch(() => ({ directAnswer: "", results: [], bodyText: "" }));

        const summaryParts: string[] = [];
        if (pageData.directAnswer) {
          summaryParts.push(`DIRECT GOOGLE KNOWLEDGE BOX ANSWER: ${pageData.directAnswer}`);
        }
        pageData.results.forEach((r, i) => {
          summaryParts.push(`[Google Result ${i + 1}] ${r.title}: ${r.snippet || r.title}`);
        });

        const summaryText = summaryParts.length > 0
          ? summaryParts.join("\n\n")
          : pageData.bodyText || `Google search complete for "${q}".`;

        return {
          executed: true,
          action,
          target: q,
          message: `Playwright Google search complete for "${q}".`,
          data: {
            directAnswer: pageData.directAnswer,
            results: pageData.results,
            summaryText,
          },
        };
      }
      case "video_control": {
        const page = await currentPage(ctx);
        await page.keyboard.press("k").catch(() => null); // YouTube play/pause
        return { executed: true, action, target, message: "Sent media toggle to the page." };
      }
      case "download_file": {
        const page = await currentPage(ctx);
        const url = normalizeUrl(target);
        const href = await page.evaluate((u) => {
          const a = document.querySelector(`a[href="${u}"]`);
          return a ? a.getAttribute("href") : null;
        }, url).catch(() => null);
        if (href) {
          await page.click(`a[href="${href}"]`).catch(() => null);
        }
        return { executed: true, action, target, message: `Initiated download for ${target}.` };
      }
      default:
        return { executed: false, action, target, message: `Unknown browser action: ${action}` };
    }
  } catch (e: any) {
    return { executed: false, action, target, message: `Browser action failed: ${e?.message || e}` };
  }
}

/** Multi-tab autonomous research task. */
export async function sandboxExec(args: {
  query: string;
  task_type?: string;
  mode?: string;
}): Promise<{ executed: boolean; message: string; data?: any }> {
  const query = String(args.query || "");
  if (!query) return { executed: false, message: "No query provided." };

  // Reuse compare/research action as the core, then synthesize a short summary.
  const res = await browserNavigate({
    action: args.task_type === "compare_products" ? "compare_products" : "research_topic",
    target: query,
  });
  const results = (res.data && res.data.results) || [];
  const titles = results.map((r: any) => r.title).filter(Boolean);
  return {
    executed: true,
    message: `Sandbox research complete for "${query}".`,
    data: {
      query,
      results,
      summary:
        titles.length > 0
          ? `Top sources: ${titles.slice(0, 5).join("; ")}.`
          : "No structured results extracted.",
    },
  };
}

async function extractMainText(page: any): Promise<string> {
  return await page.evaluate(() => {
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "NAV", "HEADER", "FOOTER", "ASIDE"]);
    const main =
      document.querySelector("main") ||
      document.querySelector("article") ||
      document.body;
    const out: string[] = [];
    main?.querySelectorAll("h1,h2,h3,p,li,td").forEach((el) => {
      if (!skip.has(el.tagName)) {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (t.length > 0) out.push(t);
      }
    });
    return out.join("\n");
  });
}

function normalizeUrl(target: string): string {
  if (!target) return "about:blank";
  if (/^https?:\/\//i.test(target)) return target;
  return "https://" + target;
}

function toSelector(target: string): string {
  if (!target) return "";
  if (/^[.#][\w-]+$/.test(target)) return target; // .class or #id shorthand
  if (target.startsWith("//") || target.startsWith("(")) return target; // xpath-ish
  return "";
}

function parseScroll(details?: string): number {
  if (!details) return 600;
  const m = /(-?\d+)/.exec(details);
  return m ? parseInt(m[1], 10) : details.includes("up") ? -600 : 600;
}
