import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import { runPowerShell } from "./powershell";

/**
 * Real file & folder operations on the user's machine.
 * Destructive actions (delete/move/rename) are gated by the safety layer
 * before this code runs.
 */

const MAX_SEARCH_RESULTS = 40;
const MAX_READ_BYTES = 200_000;

/** Resolve a target_name relative to the user home when it isn't absolute. */
function resolveTarget(name: string | undefined, baseDir: string): string {
  if (!name) return baseDir;
  if (path.isAbsolute(name)) return name;
  return path.join(baseDir, name);
}

export async function fileOperation(args: {
  action: string;
  target_name?: string;
  content?: string;
  path?: string;
  destination?: string;
  query?: string;
  source?: string;
}): Promise<{ executed: boolean; action: string; message: string; path?: string }> {
  const action = String(args.action || "").toLowerCase().trim();

  switch (action) {
    case "open_downloads": {
      const dir = path.join(os.homedir(), "Downloads");
      await openInExplorer(dir);
      return { executed: true, action, message: "Opened Downloads.", path: dir };
    }
    case "open_documents": {
      const dir = path.join(os.homedir(), "Documents");
      await openInExplorer(dir);
      return { executed: true, action, message: "Opened Documents.", path: dir };
    }
    case "open_pictures": {
      const dir = path.join(os.homedir(), "Pictures");
      await openInExplorer(dir);
      return { executed: true, action, message: "Opened Pictures.", path: dir };
    }
    case "open_desktop": {
      const dir = path.join(os.homedir(), "Desktop");
      await openInExplorer(dir);
      return { executed: true, action, message: "Opened Desktop.", path: dir };
    }
    case "open_folder":
    case "open_location": {
      const dir = resolveTarget(args.target_name || args.path, os.homedir());
      if (!fs.existsSync(dir)) {
        return { executed: false, action, message: `Folder not found: ${dir}` };
      }
      await openInExplorer(dir);
      return { executed: true, action, message: `Opened ${dir}.`, path: dir };
    }
    case "create_folder":
    case "create_directory": {
      const dir = resolveTarget(args.target_name || args.path, os.homedir());
      fs.mkdirSync(dir, { recursive: true });
      return { executed: true, action, message: `Created folder ${dir}.`, path: dir };
    }
    case "create_file": {
      const file = resolveTarget(args.target_name || args.path, os.homedir());
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const content = typeof args.content === "string" ? args.content : "";
      fs.writeFileSync(file, content, "utf-8");
      return { executed: true, action, message: `Created file ${file}.`, path: file };
    }
    case "read_file": {
      const file = resolveTarget(args.target_name || args.path, os.homedir());
      if (!fs.existsSync(file)) return { executed: false, action, message: `File not found: ${file}` };
      const stat = fs.statSync(file);
      if (stat.isDirectory()) return { executed: false, action, message: `Path is a directory: ${file}` };
      const fd = fs.openSync(file, "r");
      const buf = Buffer.alloc(Math.min(MAX_READ_BYTES, stat.size));
      fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);
      const text = buf.toString("utf-8");
      return {
        executed: true,
        action,
        message: `Read ${file} (${stat.size} bytes${stat.size > MAX_READ_BYTES ? `, first ${MAX_READ_BYTES} shown` : ""}).`,
        path: file,
        content: text,
        size: stat.size,
      } as any;
    }
    case "list":
    case "list_files": {
      const dir = resolveTarget(args.target_name || args.path, os.homedir());
      if (!fs.existsSync(dir)) return { executed: false, action, message: `Folder not found: ${dir}` };
      const entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 100).map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "folder" : "file",
      }));
      return { executed: true, action, message: `Listed ${entries.length} items in ${dir}.`, path: dir, entries } as any;
    }
    case "search_file":
    case "search": {
      const results = await searchFiles(args.target_name || args.path || args.query || "");
      return {
        executed: true,
        action,
        message: results.length
          ? `Found ${results.length} match${results.length === 1 ? "" : "es"} for "${args.target_name || args.query}".`
          : `No files found matching "${args.target_name || args.query}".`,
        results,
      } as any;
    }
    case "delete":
    case "delete_file":
    case "remove": {
      const file = resolveTarget(args.target_name || args.path, os.homedir());
      if (!fs.existsSync(file)) return { executed: false, action, message: `File not found: ${file}` };
      // Safety: never touch anything outside the user profile.
      if (!isInsideHome(file)) {
        return { executed: false, action, message: `Refused: path is outside the user folder for safety.` };
      }
      const stat = fs.statSync(file);
      if (stat.isDirectory()) {
        await fsp.rm(file, { recursive: true, force: true });
      } else {
        await fsp.unlink(file);
      }
      return { executed: true, action, message: `Deleted ${file}.`, path: file };
    }
    case "move":
    case "rename": {
      const src = resolveTarget(args.target_name || args.path || args.source, os.homedir());
      const dest = resolveTarget(args.destination, path.dirname(src));
      if (!fs.existsSync(src)) return { executed: false, action, message: `Source not found: ${src}` };
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      await fsp.rename(src, dest);
      return { executed: true, action, message: `${action === "rename" ? "Renamed" : "Moved"} ${src} -> ${dest}.`, path: dest };
    }
    default:
      return { executed: false, action, message: `Unknown file action: ${action}` };
  }
}

/** Recursively search common user folders for files matching a name pattern. */
async function searchFiles(query: string): Promise<string[]> {
  const q = String(query || "").trim();
  if (!q) return [];

  const roots = ["Desktop", "Documents", "Downloads", "Pictures", "Music", "Videos"]
    .map((f) => path.join(os.homedir(), f))
    .filter((p) => fs.existsSync(p));

  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$q = '${q.replace(/'/g, "''")}'
$roots = @(${roots.map((r) => `'${r.replace(/'/g, "''")}'`).join(",")})
$results = @()
foreach ($root in $roots) {
  Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$q*" } |
    Select-Object -First ${MAX_SEARCH_RESULTS} |
    ForEach-Object { $results += $_.FullName }
}
$results | Out-String -Width 4096
`;
  try {
    const out = (await runPowerShell(script, 20000)).trim();
    if (!out) return [];
    return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, MAX_SEARCH_RESULTS);
  } catch (e) {
    return [];
  }
}

async function openInExplorer(dir: string): Promise<void> {
  await runPowerShell(`Start-Process explorer.exe -ArgumentList '${dir.replace(/'/g, "''")}'`, 8000);
}

/** True if a path is inside the user's home directory. */
function isInsideHome(target: string): boolean {
  const home = path.resolve(os.homedir());
  const rel = path.relative(home, path.resolve(target));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}
