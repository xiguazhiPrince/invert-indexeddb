# 打包说明

本项目支持多种打包方式，适用于不同的使用场景。

## 打包方式

### 1. TypeScript 编译（默认，适合 npm 包）

```bash
npm run build
# 或
pnpm build
```

**输出：**

- `dist/` 目录下的多个文件
- 保留原始文件结构
- 包含 `.js`、`.d.ts` 和 `.map` 文件

**适用场景：**

- 发布到 npm
- 在 Node.js 或现代打包工具中使用
- 需要 Tree-shaking 优化

### 2. Rollup 打包（单文件，适合浏览器）

```bash
npm run build:bundle
# 或
pnpm build:bundle
```

**输出：**

- `dist/invert-indexeddb.umd.js` - UMD 格式（通用模块定义）
- `dist/invert-indexeddb.esm.js` - ESM 格式（ES 模块）
- `dist/invert-indexeddb.iife.js` - IIFE 格式（立即执行函数）

**适用场景：**

- 直接在浏览器中使用（通过 `<script>` 标签）
- 需要单文件打包
- CDN 分发

### 3. 完整打包（TypeScript + Rollup）

```bash
npm run build:all
# 或
pnpm build:all
```

**输出：**

- TypeScript 编译的文件
- Rollup 打包的单文件

### 4. 生产环境打包（压缩优化）

```bash
npm run build:prod
# 或
pnpm build:prod
```

**输出：**

- 所有文件（TypeScript + Rollup）
- 代码经过压缩和优化

## 使用方式

### 在 Node.js / 现代打包工具中使用

```javascript
// 使用 TypeScript 编译后的文件
import { InvertedIndexDB } from 'invert-indexeddb';
```

### 在浏览器中直接使用

#### 方式 1：UMD 格式（推荐）

```html
<script src="dist/invert-indexeddb.umd.js"></script>
<script>
  const search = new InvertedIndexDB.InvertedIndexDB('myDB');
  // 使用 SDK
</script>
```

#### 方式 2：IIFE 格式

```html
<script src="dist/invert-indexeddb.iife.js"></script>
<script>
  const search = new InvertedIndexDB('myDB');
  // 使用 SDK
</script>
```

#### 方式 3：ESM 格式（现代浏览器）

```html
<script type="module">
  import { InvertedIndexDB } from './dist/invert-indexeddb.esm.js';
  const search = new InvertedIndexDB('myDB');
  // 使用 SDK
</script>
```

## 文件说明

### TypeScript 编译输出

- `dist/index.js` - 主入口文件（CommonJS/ESM）
- `dist/**/*.d.ts` - TypeScript 类型定义文件
- `dist/**/*.map` - Source map 文件

### Rollup 打包输出

- `dist/invert-indexeddb.umd.js` - UMD 格式，支持 AMD、CommonJS 和全局变量
- `dist/invert-indexeddb.esm.js` - ES 模块格式
- `dist/invert-indexeddb.iife.js` - 立即执行函数，适合 `<script>` 标签
- `*.map` - Source map 文件

## 发布到 npm

发布前会自动执行 `build:all`：

```bash
npm publish
```

发布的内容包括：

- `dist/` 目录（所有编译和打包文件）
- `README.md`
- `package.json` 中 `files` 字段指定的文件

## 注意事项

1. **TypeScript 编译**：保留原始文件结构，适合模块化使用
2. **Rollup 打包**：单文件，适合浏览器直接使用
3. **生产环境**：使用 `build:prod` 会压缩代码，减小文件大小
4. **Source Map**：所有打包都包含 source map，方便调试
