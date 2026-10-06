# Model Cost Lens · 模型成本透镜

一个无后端、无依赖的模型成本比较工具。调整输入输出比与输入缓存命中率，实时计算折算价和价格 / 评分的 Pareto 边界（斩杀线）。

## 在线演示

在线演示：<https://model-cost-lens.linyi-wang.chatgpt.site>。源代码：<https://github.com/ChuHanModel/model-cost-lens>。

## 为什么做

模型的三项单价不能独立决定实际使用成本。以同一组价格为例：

| 使用构成（缓存输入 : 普通输入 : 输出） | GLM-5.3 Flash | MiMo-V2.6-Pro |
|---|---:|---:|
| 97 : 2 : 1 | ¥0.2671 | ¥0.1443 |
| 本地林课任务构成 ≈ 84.76 : 12.78 : 2.45 | ¥0.3659 | ¥0.5519 |

单位均为 **人民币 / 百万总 Token**。两组对比固定各模型使用相同构成；并非对厂商实际账单或跨模型缓存表现的测量。

## 功能

- 输入输出比、输入缓存命中率两个独立参数。
- 林课样本、97:2:1、无缓存三个预设，按精确计数而非取整百分比计算。
- 模型三项单价、折算价、原评分、边界状态和排序。
- 交互式成本 / 评分散点图；价格坐标采用 log(1 + cost / 0.1) 压缩，支持 0 价格。
- CSV 文件导入、粘贴、模板下载、结果导出；数据仅留在当前浏览器页面内存。
- 缺失价格不算零；权重为零的项不需要单价。相同成本与评分均保留在边界。
- 可选 WebMCP `configure_cost_scenario`，与可见界面共用验证和状态。

## 本地运行与验证

需要 Node.js 18+（测试）及 Python 3（静态服务）。无 npm 依赖，无需安装。

```sh
npm run check
npm test
npm start
```

打开 <http://127.0.0.1:8768>。也可将 `dist/` 发布到任意静态网站托管服务。

## CSV 格式

```csv
model,provider,score,cache,input,output
Example A,Custom,60,0.1,1,3
Example B,Custom,65,0.2,2,6
```

`provider` 可选，其余列必需。单价为人民币 / 百万该类别 Token，未知价格留空；零价格写 `0`。模型使用相同评分体系。支持 BOM、CRLF、双引号转义和带引号的多行字段；一次最多 500 行、文件不超过 1 MB。导出用户提供的名称时防止常见电子表格公式注入。

## 公式

设 `r = total_input / output`，`h = cached_input / total_input`（0–1）：

```text
cached_share   = r*h / (r+1)
uncached_share = r*(1-h) / (r+1)
output_share   = 1 / (r+1)
cost = cache_price*cached_share + input_price*uncached_share + output_price*output_share
```

对于模型 A，如果存在 B 满足 `cost_B <= cost_A` 且 `score_B >= score_A`，同时至少一项严格更优，则 A 被支配。否则 A 在 Pareto 边界上。连线仅辅助阅读。

## 数据与边界

- 初始数据为 [AIHOT 综合模型榜](https://aihot.news/leaderboard) 2026-10-06 当时“国产模型”筛选的 25 行快照。保留模型名、原榜名次、综合评分和三项公开价格。快照不自动更新，未逐项重验厂商价格；不是完整榜单，也不是知识问答榜。
- 林课预设来自 2026-09-30 至 10-02 的 52 个本地业务会话、453 次有用量的模型响应：普通输入 1,739,294、缓存输入 11,531,904、输出 333,691，总量 13,604,889 Token。排除独立 A/B、环境维护、标准 preset 和空会话；按 Token 总量加权。原始对话、日志、账号和个人教务数据未发布。
- 本地任务主要使用 DeepSeek。换模型可能改变分词、输出与缓存表现；保留比例只是一项控制变量假设。
- 不计算缓存写入/存储、阶梯/超长上下文价格、订阅、税费或隐含推理用量。推理 Token 若供应商计入输出，使用者应计入自己的输出统计。
- 评分不是正确率；价格 / 评分边界不代替业务验收。
- 本项目是独立工具，与 AIHOT 无官方关系，不使用其 Logo 或品牌样式。

## 许可证

作者：ChuHanModel。代码 MIT，见 [LICENSE](LICENSE)。模型名、评分和价格为带来源的事实快照，代码许可证不改变第三方数据或品牌的权益。
