/**
 * 测试数据文件
 * 包含测试文档列表和测试用例
 */

// 测试文档列表
const testDocuments = [
  {
    id: 'doc1',
    title: 'JavaScript 编程指南',
    content: 'JavaScript 是一种高级编程语言，广泛用于 Web 开发。',
    category: '技术',
    author: '张三',
  },
  {
    id: 'doc2',
    title: 'Python 数据分析',
    content: 'Python 是数据科学领域最流行的编程语言之一。',
    category: '技术',
    author: '李四',
  },
  {
    id: 'doc3',
    title: '机器学习入门',
    content: '机器学习是人工智能的一个重要分支，涉及算法和统计模型。',
    category: 'AI',
    author: '王五',
  },
  {
    id: 'doc4',
    title: 'Web 开发最佳实践',
    content: '现代 Web 开发需要掌握多种技术和框架。',
    category: '技术',
    author: '赵六',
  },
  {
    id: 'doc5',
    title: '深度学习基础',
    content: '深度学习使用神经网络来模拟人脑的学习过程。',
    category: 'AI',
    author: '王五',
  },
  {
    id: 'doc6',
    title: 'React 框架教程',
    content: 'React 是一个用于构建用户界面的 JavaScript 库。',
    category: '前端',
    author: '张三',
  },
  {
    id: 'doc7',
    title: 'Node.js 后端开发',
    content: 'Node.js 允许使用 JavaScript 进行服务器端开发。',
    category: '后端',
    author: '李四',
  },
  {
    id: 'doc8',
    title: '数据库设计原理',
    content: '良好的数据库设计是构建稳定应用的基础。',
    category: '数据库',
    author: '赵六',
  },
  {
    id: 'doc9',
    title: '算法与数据结构',
    content: '掌握算法和数据结构是成为优秀程序员的关键。',
    category: '基础',
    author: '王五',
  },
  {
    id: 'doc10',
    title: 'TypeScript 类型系统',
    content: 'TypeScript 为 JavaScript 添加了静态类型检查功能。',
    category: '前端',
    author: '张三',
  },
];

// 测试用例数组
const testCases = [
  {
    name: '基础搜索 - JavaScript',
    query: 'JavaScript',
    options: {},
    expectedDocIds: ['doc1', 'doc6', 'doc7', 'doc10'],
  },
  {
    name: '中文搜索 - 机器学习',
    query: '机器学习',
    options: {},
    expectedDocIds: ['doc3'],
  },
  {
    name: 'AND 操作符 - 技术 + 开发',
    query: '技术 开发',
    options: {
      operator: 'AND',
    },
    expectedDocIds: ['doc1', 'doc4'],
  },
  {
    name: 'OR 操作符 - Python 或 React',
    query: 'Python React',
    options: {
      operator: 'OR',
    },
    expectedDocIds: ['doc2', 'doc6'],
  },
  {
    name: '模糊搜索 - javascrpt (拼写错误)',
    query: 'javascrpt',
    options: {
      fuzzy: true,
    },
    expectedDocIds: ['doc1', 'doc6', 'doc7', 'doc10'], // 应该能匹配到 JavaScript
  },
  {
    name: '精确匹配 - "Web 开发"',
    query: 'Web 开发',
    options: {
      exact: true,
    },
    expectedDocIds: ['doc1', 'doc4'], // doc1 的 content 和 doc4 的 title/content 都包含 "Web 开发"
  },
  {
    name: '限制结果数量',
    query: '开发',
    options: {
      limit: 2,
    },
    expectedDocIds: ['doc1', 'doc4'], // 只返回前 2 个（按 docId 排序后应该是 doc1, doc4）
  },
  {
    name: '搜索作者 - 张三',
    query: '张三',
    options: {},
    expectedDocIds: ['doc1', 'doc6', 'doc10'],
  },
  {
    name: '搜索分类 - AI',
    query: 'AI',
    options: {},
    expectedDocIds: ['doc3', 'doc5'],
  },
  {
    name: '多词搜索 - 数据 分析',
    query: '数据 分析',
    options: {
      operator: 'AND',
    },
    expectedDocIds: ['doc2'],
  },
  {
    name: '无结果搜索',
    query: '不存在的关键词xyz123',
    options: {},
    expectedDocIds: [],
  },
];
