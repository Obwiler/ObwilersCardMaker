/**
 * 版本号同步脚本
 * 单一真相源: version.json → 自动同步所有消费者
 * 用法: node scripts/sync-version.mjs [--check]
 *   (默认) 同步模式: 读取 version.json, 写入所有消费者
 *   --check  校验模式: 只检查不写入, 不一致则 exit(1)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// === 1. 读取真相源 ===
const versionJson = JSON.parse(readFileSync(resolve(ROOT, 'version.json'), 'utf-8'));
const VERSION = versionJson.version;

// === 2. 消费者定义 ===
const consumers = [
  {
    path: 'package.json',
    reader: (content) => JSON.parse(content).version,
    writer: (content) => {
      const pkg = JSON.parse(content);
      pkg.version = VERSION;
      return JSON.stringify(pkg, null, 2) + '\n';
    }
  },
  {
    path: 'src-tauri/Cargo.toml',
    reader: (content) => {
      const m = content.match(/^version\s*=\s*"([^"]+)"/m);
      return m ? m[1] : null;
    },
    writer: (content) => content.replace(/^version\s*=\s*"[^"]*"/m, `version = "${VERSION}"`)
  },
  {
    path: 'src-tauri/tauri.conf.json',
    reader: (content) => JSON.parse(content).version,
    writer: (content) => {
      const conf = JSON.parse(content);
      conf.version = VERSION;
      return JSON.stringify(conf, null, 2) + '\n';
    }
  },
  {
    path: 'src-tauri/crates/tag/Cargo.toml',
    reader: (content) => {
      const m = content.match(/^version\s*=\s*"([^"]+)"/m);
      return m ? m[1] : null;
    },
    writer: (content) => content.replace(/^version\s*=\s*"[^"]*"/m, `version = "${VERSION}"`)
  },
  {
    path: 'src-tauri/crates/parser/Cargo.toml',
    reader: (content) => {
      const m = content.match(/^version\s*=\s*"([^"]+)"/m);
      return m ? m[1] : null;
    },
    writer: (content) => content.replace(/^version\s*=\s*"[^"]*"/m, `version = "${VERSION}"`)
  },
  {
    path: 'src-tauri/crates/duel/Cargo.toml',
    reader: (content) => {
      const m = content.match(/^version\s*=\s*"([^"]+)"/m);
      return m ? m[1] : null;
    },
    writer: (content) => content.replace(/^version\s*=\s*"[^"]*"/m, `version = "${VERSION}"`)
  },
  {
    path: 'docs/version.json',
    reader: (content) => JSON.parse(content).version,
    writer: (content) => {
      const vj = JSON.parse(content);
      vj.version = VERSION;
      vj.major = versionJson.major;
      vj.minor = versionJson.minor;
      vj.patch = versionJson.patch;
      vj.label = versionJson.label;
      return JSON.stringify(vj, null, 2) + '\n';
    }
  }
];

// === 3. 执行 ===
const checkOnly = process.argv.includes('--check');
let allOk = true;

for (const consumer of consumers) {
  const filePath = resolve(ROOT, consumer.path);

  if (!checkOnly) {
    // 同步模式
    const content = readFileSync(filePath, 'utf-8');
    const updated = consumer.writer(content);
    writeFileSync(filePath, updated, 'utf-8');
    console.log(`[SYNC] ${consumer.path} → ${VERSION}`);
  } else {
    // 校验模式
    try {
      const content = readFileSync(filePath, 'utf-8');
      const current = consumer.reader(content);
      if (current !== VERSION) {
        console.error(`[FAIL] ${consumer.path}: 当前 "${current}" ≠ 期望 "${VERSION}"`);
        allOk = false;
      } else {
        console.log(`[OK] ${consumer.path}: ${VERSION}`);
      }
    } catch (e) {
      console.error(`[FAIL] ${consumer.path}: 读取失败 (${e.message})`);
      allOk = false;
    }
  }
}

if (checkOnly && !allOk) {
  console.error('\n版本号不一致! 请执行 node scripts/sync-version.mjs 进行同步');
  process.exit(1);
}

console.log(checkOnly ? '\n版本号校验通过' : '\n版本号同步完成');