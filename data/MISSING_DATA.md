# 传统数据缺失报告

截至 2026-07-26，生产目录 `data/catalog/index.json` 已包含版本 `hexagram-mapping-2026-07-20-v1` 的 8 条八卦和 64 条结构映射；`data/source/classical/liuyao-overview-authorized-v1.json` 已包含项目负责人授权的 64 条卦辞与 384 条普通爻辞引用。以下数据仍未完成来源、版本和授权核验，因此没有导入：

- 彖传、象传、文言及其他经传文本；
- 乾用九、坤用六等特殊爻辞，以及不同版本的校勘/异文记录；
- 八宫、世应、纳甲、六亲、六神等专业六爻规则表；
- 旺衰、取用神、动变分析等解释规则。
- 自动解卦规则与风险边界：`data/source/interpretations/` 中已授权的 64 条卦辞与 384 条爻辞
  白话释义仅为学习参考，不能替代结构化规则、专业六爻规则或针对用户问题的吉凶判断。
- 产品原创的问题分类、解释模板、免责声明和安全审核记录；
- 可用于回归的人工确认金标准排盘案例。

导入前必须为每条记录补全 `docs/DATA_SOURCES.md` 要求的来源元数据，通过 `pnpm run validate:data`，并由明确的审核人确认内容与授权状态。`data/examples/` 中的文件只验证结构，不是候选数据。

## 64 卦结构映射来源核验记录（已完成）

2026-07-20 使用应用内浏览器核验：

- Unicode 17.0.0 UCD `https://www.unicode.org/Public/17.0.0/ucd/NamesList.txt` 固定 U+2630..U+2637 八卦符号和 U+4DC0..U+4DFF 六十四卦符号/顺序；`https://www.unicode.org/license.txt` 为 Unicode License v3；
- 项目负责人提供 `六爻App模块四内容数据库详细说明.txt`（SHA-256 `E44D669F17CD9C90D30FC7481E3F6D741D5E9B40AA4CE4004D04BF1405BE2AD7`），第 3、4 节明确给出简体名称、八卦编码及 64 卦文王序/上下卦表，并在当前任务中批准作为相应数据源；
- 维基文库《周易》固定版本 `https://zh.wikisource.org/w/index.php?title=周易&oldid=7907208` 用于交叉核对六十四卦速查矩阵和文王序。页面标示原作为公有领域、站点文本采用 CC BY-SA 4.0，同时提示页面未校对或来源可靠性未知，因此不单独作为生产主源，也没有复制经文或现代解释；
- 中国哲学书电子化计划 `https://ctext.org/book-of-changes/yi-jing/zh` 展示 64 卦顺序、卦名、符号及单卦页的组成八卦链接，但站点声明网站内容版权和自动批量使用限制。本项目尚未确认可再发布授权、采用底本、字符规范化策略和人工校对人。

生产映射由用户提供表逐行解析，再与固定 Unicode 数据和维基文库矩阵交叉校验；64 个符号、文王序、上下卦组合和六位码均经过自动完整性测试。没有启动网站批量爬取，也没有把中国哲学书电子化计划内容并入 production。

模块三测试夹具仍标记为 `pending-test-only`，不参与产品查询。当前已完成八卦与 64 卦结构映射、已授权卦辞/爻辞引用以及独立授权的白话学习释义；其余经传与专业六爻规则继续保持缺失。

模块四 v2 已补齐这些数据进入系统前所需的结构和门禁，并已将上述 72 条已核验结构同步为 production seed `hexagram-mapping-2026-07-20-v1`；draft seed `draft-empty-v2` 为 0 条。详细说明中的八宫、纳甲等专业表仍需确认采用的规则体系、校对人和校对时间，不能因为结构已就绪就直接提升为 production。

## M4-A 候选验收包（2026-07-25）

验收包 SHA-256 为 `537d3ec190263166c1a3f541c962c44ce12bec47ba30b5c8cdc2a8841c8953a4`。其中的乾、坤正文（34 个文本单元）、八卦扩展字段、八宫 64 条、纳甲 48 条、六亲 25 条、六神 60 条、地支关系候选、18 个问题分类和 6 个免责声明，均已保存为 `data/draft/` 的候选包并通过独立 Schema 校验。

它们**不是 production 内容**：没有被导入 `data/source/content-dataset.json` 或运行时 SQLite，也没有生成虚假的复核人、修订号或双人签署。仍需固定底本、逐条 `sourceLocator`、授权确认、两位不同审核人和显式 promotion 后才能进入 production。维基文库采集脚本只保存原始 wikitext、revision 和 SHA 至 `data/draft/classical/raw/`，要求真实联系邮箱且未在本任务执行；不得爬取 CText。

## 经传候选转录种子（2026-07-26）

`scripts/fetch-kanripo-zhouyi-seed.py` 通过 GitHub API 将 Kanripo `KR1a0001` 的 69 个文本
文件固定到单一 commit，保存原始字节、Git blob SHA-1、SHA-256、上游 URL 与集合哈希至
`data/draft/classical/kanripo-kr1a0001/`。Kanripo 页面声明其创建内容采用 CC BY-SA 4.0；
因此候选目录附带署名和许可链接。

这些文件的唯一角色是 `TRANSCRIPTION_SEED`。项目指定的《周易正义十卷》清嘉庆二十年
（1815）浙江图书馆藏扫描件仍是人工核验底本；目前没有提供四册扫描件的稳定文件 URL，
所以候选记录没有、也不得伪造扫描页、叶码、栏行定位。该候选集固定为
`production_candidate` 与 `publicationEligible: false`，不得进入网站、SQLite 或 API 查询。

## 模块五专业规则缺失审计

项目负责人提供的 `六爻App模块五专业六爻数据源与规则说明.txt`（SHA-256 `715CC564EAC1C4548F2BAC0BCB1059D0CA9784B0DB67D3D9B504C5C15039B591`）建议 `jingfang_yehe_baseline@1.0.0`，同时明确要求关键表、历法与金标准在生产前完成来源固定和双人复核。该文件目前作为工程规格与候选来源索引，不作为专业表已核验的证明。

截至 2026-07-20，仍缺：完整八宫/世应 64 条、纳甲 48 条、五行/六亲矩阵、十日干六神起例、六旬空亡表的固定来源定位与双人签字；节气离线数据、日柱基准、固定 tzdb 与历法算法；旺衰/用神/动变/飞伏逐条规则；以及全部人工金标准排盘。`src/domain/professional` 的 test-only fixture 仅验证接口与不变量，不属于 `data/catalog`，不得提升或发布。详细门禁见 `docs/PROFESSIONAL_RULES_SPEC.md`。
