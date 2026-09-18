# M4-A 候选数据

此目录仅保存“可审计候选”与项目原创待审核内容，绝不由应用启动时导入 SQLite，也不参与 `data/source/` 的 production seed。

- `classical/`：验收包提供的乾、坤经文候选；每个文本单元独立保存，不代表已经校定。
- `classical/kanripo-kr1a0001/`：由 `scripts/fetch-kanripo-zhouyi-seed.py` 固定到 Git
  提交的 69 个经传转录种子。它记录 CC BY-SA 4.0 署名与逐文件哈希，只能作为与项目
  指定的 1815 年扫描底本逐条比对的候选，绝不进入 production。
- `interpretations/`：已授权白话解释数据在发布前的候选快照。它与 production 版本并存，
  用于审计差异；该目录自身不参与网站结果、专业规则或 AI 输入。
- `professional/`：京房/野鹤候选规则；八宫、纳甲、六亲、六神、地支关系均待来源定位和双人复核。
- `product/`：产品原创的分类、模板、免责声明，待产品安全审核。
- `manifests/`：64 卦页面的显式 ID manifest，不依赖数组位置。

运行 `pnpm run build:m4-candidates` 可由验收包构建这些文件；运行 `pnpm run build:draft-interpretations` 可从负责人提供的白话解读稿重建隔离候选集；运行 `pnpm run validate:m4-candidates` 或 `pnpm run validate:data` 校验数量和结构。任何晋级必须新建内容版本、记录固定底本/修订号/哈希，并由两位不同审核员签署。
