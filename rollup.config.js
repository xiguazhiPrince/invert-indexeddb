const typescript = require('@rollup/plugin-typescript');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { terser } = require('@rollup/plugin-terser');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = [
  // UMD 格式（浏览器全局变量）
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/invert-indexeddb.umd.js',
      format: 'umd',
      name: 'InvertedIndexDB',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      isProduction && terser(),
    ],
  },
  // ESM 格式（现代浏览器和打包工具）
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/invert-indexeddb.esm.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      isProduction && terser(),
    ],
  },
  // IIFE 格式（立即执行函数，适合 script 标签）
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/invert-indexeddb.iife.js',
      format: 'iife',
      name: 'InvertedIndexDB',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      isProduction && terser(),
    ],
  },
];

