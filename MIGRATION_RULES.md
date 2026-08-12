# cppreference 迁移完整规则

本文档是把本地英文 cppreference HTML 迁移为本项目 Fumadocs MDX 的规范性规则。它同时约束人工迁移、Agent 迁移、迁移脚本、验证器和最终页面审查。本文中的“必须”“不得”“应该”分别表示强制要求、禁止事项和默认要求。

## 1. 目标与适用范围

- 当前源语料是 `ref/cppreference-en/reference/en` 下的英文 HTML。
- 当前目标内容目录是 `apps/docs/content/docs`。
- C 页面写入 `apps/docs/content/docs/c/...`；C++ 页面写入 `apps/docs/content/docs/cpp/...`。
- 目标格式是可由 Fumadocs 编译的 MDX，不是源 HTML 的视觉复刻，也不是内容摘要。
- 迁移只改变表示形式，不改变技术事实、标准版本、代码、链接含义、条目关系或顺序。
- 页面必须可追溯、可验证、可审查；“能渲染”不等于“迁移完成”。

## 2. 规范来源与优先级

遇到冲突时按以下优先级处理：

1. 本地源 HTML 与提取出的 Lossless Page IR 中的事实。
2. `packages/page-ir/src/schema.ts` 定义的数据结构和类型约束。
3. `packages/migrate/src/component-registry.ts` 定义的语义组件契约。
4. 本文档。
5. `AGENTS.md` 中的仓库级摘要规则。
6. 邻近已迁移页面的排版惯例。

邻近页面只能用于复用结构和风格，不能覆盖源页面事实。无法在这些来源中消除的歧义必须进入人工复核，禁止猜测。

## 3. 完成定义

一个页面只有同时满足以下条件才算迁移完成：

- 页面路径和导航元数据正确。
- frontmatter 完整且准确。
- 所有源区块均有且只有一个 `sourceId` 覆盖标记。
- `sourceId` 顺序与 Lossless Page IR 完全一致。
- 所有可见技术内容均已表示；没有总结、改写、杜撰或静默遗漏。
- 所有不可变事实均已保留：代码、链接文本、规范化目标、版本标记、缺陷报告编号和标准、表格关系。
- 使用已有语义组件或普通 Markdown；没有页面局部组件、原始 HTML 逃生口或未注册组件。
- MDX 可编译，页面可实际访问。
- 相关验证、测试和生产构建通过。
- 浏览器审查确认桌面和窄屏下无溢出、截断、重叠、错误层级或明显样式分裂。

## 4. 标准迁移流水线

### 4.1 确认源文件和目标 slug

源文件路径与目标路径保持同一语义层级。例如：

```text
ref/cppreference-en/reference/en/cpp/container/vector.html
→ apps/docs/content/docs/cpp/container/vector.mdx
```

目标 slug 优先使用 `ref/cppdoc/migrate/slug_map.json` 中的映射；没有映射时使用规范化的源 slug。不得自行改名、缩写或重组目录。

### 4.2 提取 Lossless Page IR

先提取，后迁移：

```bash
bun run extract \
  ref/cppreference-en/reference/en/cpp/container/vector.html \
  /tmp/cpp__container__vector.source.json
```

提取结果是迁移事实清单。迁移前必须检查：

- `meta.slug`、`meta.title`、`meta.language`、`meta.sourceUrl`；
- `sections[].heading`、`headingLevel`、`anchor`；
- 每个 block 的 `sourceId`、`order`、`tagName`、`classes`、`visibleText`；
- `immutable.code`；
- `immutable.links` 中的 `text`、`href`、`normalizedHref`、`kind`；
- `immutable.inlineRevisions` 中的精确文本范围、marker 和 revisions；
- `immutable.revisions`；
- `immutable.tableSpans`。

不得只阅读浏览器可见文本后直接写页面。源 HTML 的结构和 IR 中的不可变字段都必须检查。

### 4.3 选择迁移路径

直接 MDX Agent 路径：

```bash
DEEPSEEK_API_KEY=... \
DEEPSEEK_BASE_URL=https://api.deepseek.com \
DEEPSEEK_MODEL=deepseek-v4-flash \
bun run migrate:direct \
  ref/cppreference-en/reference/en/cpp/container/vector.html \
  /tmp/vector.mdx \
  /tmp/vector.validation.json
```

语义 IR 路径用于分类、结构验证和确定性渲染：

```bash
bun run golden <source.html> <output-directory> --agent
```

不论走哪条路径，Agent 输出都是候选产物，不得绕过确定性验证和浏览器审查后直接发布。

### 4.4 写入正式路径并更新导航

- 页面写入与 slug 对应的 `.mdx` 文件。
- 目录缺少 `meta.json` 时创建；已存在时只追加本页。
- 父级 `meta.json` 必须包含新子目录。
- `pages` 顺序应遵循文档领域结构，不按迁移时间排列。
- 不得因为目标链接页面尚未迁移而删除源链接。

### 4.5 验证候选 MDX

```bash
bun run packages/migrate/src/cli.ts validate-mdx \
  <source.html> \
  <page.mdx> \
  <report.json>
```

验证报告中的错误必须逐项回到源 block 修正。禁止通过放宽验证器、删除不可变事实或填入不可见占位文本来“消除”错误。

### 4.6 运行回归和实际页面检查

```bash
bun run typecheck
bun test
bun run build
```

随后启动文档站并实际访问目标路由。检查页面结构、交互、链接、语法高亮、响应式布局、水平溢出和控制台/页面错误。

## 5. 保真与来源映射

### 5.1 可见内容

- 必须保留所有可见技术内容，包括说明段落、列表项、注释、输出、脚注、注记、复杂度、模板参数、缺陷报告和参见条目。
- 不得总结、润色、现代化措辞、修正源站表达或补充模型知识。
- 可以进行仅由 Markdown/MDX 表示要求造成的机械转换，例如：
  - HTML 列表转 Markdown 列表；
  - `1)`、`2)` 的说明序列转 `1.`、`2.`；
  - HTML 代码块转 fenced code block；
  - 表格或描述表转对应语义组件；
  - 源站括号版本标记转版本组件。
- 空白可按 Markdown 语法规范化，但代码中的有效空白、换行和标点必须保留。

### 5.2 `sourceId` 标记

每个源 block 必须在其输出表示之前出现一次：

```mdx
{/* source:cpp-container-vector:0003 */}
The elements are stored contiguously.
```

强制规则：

- 使用 IR 提供的精确 ID，禁止自行生成。
- 每个 ID 恰好出现一次。
- ID 的全页顺序必须与 IR 相同。
- 标记必须紧邻其代表的内容。
- 标题没有独立输入 block 时，不得伪造标题 source marker。
- 一个语义组件覆盖多个相邻 block 时，各标记仍须按输入顺序放在对应内容边界附近。
- 不得为了通过覆盖计数，把标记集中堆放在页面开头或无关位置。

### 5.3 不可变事实

下列内容必须视为不可变：

- 函数签名、声明、示例源码、输出文本和宏值；
- 链接的可见文本和规范化目标；
- `since`、`until`、`removed` 及其精确作用域；
- CWG/LWG 编号、适用标准、已发布行为和修正行为；
- 表格的行列关系以及有语义意义的 `rowSpan`、`colSpan`；
- 条目顺序和声明编号对应关系。

若源 HTML 与提取 IR 对这些事实不一致，先修复提取器或标记人工复核，不得让 Agent自行选择。

## 6. Frontmatter、标题和章节

每个页面使用 YAML frontmatter：

```yaml
---
title: "std::vector"
description: "std::vector is a sequence container that encapsulates dynamic size arrays."
source_url: "https://en.cppreference.com/w/cpp/container/vector"
language: "C++"
---
```

规则：

- `title` 使用页面主题的准确名称。
- `description` 来自源页面的首要定义，不得编写宣传文案。
- `source_url` 使用 `meta.sourceUrl`。
- `language` 只能与 IR 一致，为 `C` 或 `C++`。
- 页面标题只放在 frontmatter；正文不得重复一级标题。
- 每个源章节标题只输出一次，并保持原始层级。
- 不得把 H3 提升为 H2 以追求视觉效果。
- Fumadocs 自动生成标题锚点时，不写不受支持的 `{#Anchor}` 语法。
- 源 fragment 链接依赖特定锚点时，必须验证最终渲染 ID；不得假设大小写和下划线会原样保留。

## 7. 普通 Markdown 与组件边界

优先使用普通 Markdown 表达普通文档结构：

- 标题；
- 段落；
- 有序和无序列表；
- fenced code block；
- 简单、规则的普通表格；
- 脚注；
- 普通内部和外部链接。

只有存在稳定、反复出现的 C/C++ 语义关系时才使用组件。不得为了排版创建组件，也不得把普通内容包进无意义的 React 容器。

禁止：

- 页面内 `import`；
- 页面局部组件；
- `<SourceHtml>`；
- `dangerouslySetInnerHTML`；
- `<script>`、`<style>`；
- 复制源 HTML 作为迁移结果；
- 通用 flex table 或布局逃生组件；
- 未在 `apps/docs/components/mdx.tsx` 注册的组件；
- 用对象或数组 prop 承载本应由子组件表达的语义内容。

## 8. 声明文档

### 8.1 基本结构

声明和对应说明使用：

```mdx
<DeclarationDoc>
  <Declaration id="1" language="cpp" code={`template<class T> class vector;`} />
  <Declaration id="2" language="cpp" since="C++17" code={`namespace pmr {
    template<class T>
    using vector = std::vector<T, std::pmr::polymorphic_allocator<T>>;
  }`} />

  <DeclarationDescription>
    1. First declaration description.
    2. Second declaration description.
  </DeclarationDescription>
</DeclarationDoc>
```

### 8.2 声明规则

- 一个声明组必须由一个完整的 `<DeclarationDoc>` 包裹。
- 每个声明变体使用一个 `<Declaration>`。
- `language` 必须为 `c` 或 `cpp`，并与代码语言一致。
- 声明代码写入 `code` prop；普通声明由组件进行语法高亮。
- 只有语法元变量式声明使用 `grammar`，不要用它代替真正的 C/C++ 高亮。
- 多声明源编号必须写入对应声明的 `id="1"`、`id="2"`；编号不得悬浮在组件外，也不得写进代码字符串。
- 声明编号与正文有序列表必须一一对应且顺序一致。
- 只有一个且无歧义的声明时可以省略 `id`。
- 声明专属版本直接写在该 `<Declaration>` 上，例如 `since="C++17"`；不得在声明后另放空 `<Revision />`。
- 声明组整体受版本约束时，版本可以放在 `<DeclarationDoc>`；不要把整组版本错误地下放到每个变体。
- `since`、`until`、`removed` 只能来自源版本证据。
- 不得合并语义不同的声明，也不得拆分一个不可分割声明。

### 8.3 声明视觉契约

迁移内容不写样式，但必须选择能满足现有视觉契约的组件结构：

- 声明编号位于左列，在对应声明高度内水平、垂直居中。
- 声明代码位于中列并使用 C/C++ 语法高亮。
- 声明版本胶囊位于右列，文字在胶囊内水平、垂直居中。
- 编号、代码和版本不得彼此覆盖。
- 窄屏允许重排，但不得截断声明或产生整页水平溢出。

## 9. 版本信息

### 9.1 块级版本

当版本约束整个段落、条目正文或完整内容块时使用：

```mdx
<Revision since="C++20">
Member functions of `std::vector` are constexpr.
</Revision>
```

可用 prop：

- `since="C++20"`；
- `until="C++17"`；
- `removed="C++20"`；
- 合法的组合，例如 `since="C++11" until="C++17"`。

### 9.2 行内版本

当版本只修饰一个词组、链接或条目名时使用：

```mdx
<InlineRevision since="C++17">[ContiguousContainer](/docs/cpp/named-req/ContiguousContainer)</InlineRevision>
```

规则：

- 包裹范围必须等于 `immutable.inlineRevisions[].text` 对应的精确文本范围。
- 不得把行内版本提升为整个段落的 `<Revision>`。
- 不得把版本压平为普通的 `(since C++17)` 文本。
- 仅有版本、没有文本内容的成员条目标记可以使用空的 `<InlineRevision since="C++23" />`。
- 行内版本的正文范围必须有连续的浅色覆盖，以准确显示版本作用域，例如 `and lambda-expressions,` 整段均被覆盖。
- 正文覆盖与 `since C++xx` 标签必须是两个独立视觉层：覆盖不得延伸到、包住或破坏已有的版本胶囊；胶囊仍保持单层。
- 胶囊内文字必须居中，不得再套另一层覆盖。

### 9.3 版本样式语义

- 所有版本标签复用 `RevisionMark`。
- 版本标签使用无衬线字体；不得使用等宽字体伪装成代码。
- 胶囊使用克制的语义色，不加边框或阴影。
- 同一声明列表中的版本标签保持一致宽度和对齐。
- 禁止页面自己创建 badge 或使用 Markdown 粗体模拟版本标签。

## 10. 描述列表、成员和参数

### 10.1 通用术语—描述关系

成员类型、成员函数、非成员函数、特殊化、迭代器失效、参见条目及其他明确的两列关系使用：

```mdx
<DescriptionList>
  <DescriptionItem>
    <DescriptionTerm>`value_type`</DescriptionTerm>
    <DescriptionBody>`T`</DescriptionBody>
  </DescriptionItem>
</DescriptionList>
```

规则：

- 一个列表只能使用一套完整父子结构。
- 每项必须同时含 `<DescriptionTerm>` 和 `<DescriptionBody>`。
- 保持源顺序。
- 不得推断缺失说明。
- 同一页面中语义等价的两列区域必须统一使用 `<DescriptionList>`，不要一部分用 Markdown table、一部分用组件。
- 当前统一范围包括：Specializations、Iterator invalidation、Member types、Member functions、Element access、Iterators、Capacity、Modifiers、Non-member functions 和 See also。
- 普通表格标题行不应残留在转成描述列表的内容中。
- 列表统一使用顶部、逐行底部分隔线；不得给单项加卡片边框。
- 各区域字号、行高、术语列宽、字重和分隔线必须一致。

### 10.2 代码词项

- 标识符、类型、表达式和函数名使用反引号。
- 反引号只表示代码，不用于一般强调。
- 描述列表左右两列中的代码使用相同等宽字体、字号、行高和字重。
- `value_type&`、`Allocator::pointer`、`std::allocator_traits<Allocator>::pointer`、`end()` 等右列代码必须与左列代码词项保持一致的字体和粗细。
- 代码文本使用项目绿色语义色。
- 行内代码是平面文字：不得出现框、芯片背景、额外 padding、圆角或阴影。
- 链接中的代码仍保持同一代码字型和颜色，不得因 `<a>` 的默认样式缩小或变细。

### 10.3 参数列表

模板参数或函数参数使用：

```mdx
<ParameterList>
  <Parameter name="Allocator">
    Parameter description.
  </Parameter>
</ParameterList>
```

规则：

- `name` 是不可变代码文本。
- 参数说明中的版本分支放在对应 `<Parameter>` 内。
- 不得用 Markdown 粗体或普通表格代替已有参数组件。
- 参数列表与描述列表共享平面两列布局、字号和分隔线规则。

## 11. 表格

### 11.1 普通 Markdown 表格

满足以下条件时使用 Markdown 表格：

- 行列规则；
- 无合并单元格；
- 无需要组件表达的版本分支；
- 关系确实是数据矩阵，而不是术语—描述列表。

典型用途：feature-test macro 表。

```md
| Feature-test macro | Value | Std | Feature |
| --- | ---: | --- | --- |
| `__cpp_lib_containers_ranges` | `202202L` | C++23 | Ranges construction and insertion for containers |
```

### 11.2 复杂表格

- `rowSpan` 或 `colSpan` 大于 1 且承载语义时，必须保留关系。
- Markdown 表格无法表达合并关系时，可使用最小必要的结构化表格表示，但不得复制整段源 HTML。
- 使用结构化表格前先确认没有已注册语义组件可表达。
- 表格必须保持扁平：行分隔线可以保留，外框、盒状单元格和嵌套卡片禁止。
- 宽表格必须在窄屏可访问，但不得让整个页面产生水平溢出。

### 11.3 不得误用表格

下列内容优先使用语义组件而不是表格：

- 成员名称及说明；
- 参数及说明；
- 特殊化及说明；
- 迭代器失效操作及结果；
- 缺陷报告；
- 声明及标准版本。

## 12. 链接

### 12.1 内部链接

提取器负责把源相对链接和 cppreference URL 规范化为目标 slug：

- 删除 `/w/` 或 `/reference/en/` 前缀；
- 删除 `.html`；
- 应用 `slug_map.json`；
- 保留 fragment；
- 未映射时进行规范 slug 转换。

直接写 Markdown 内部链接时加 `/docs/`：

```md
[`capacity`](/docs/cpp/container/vector/capacity)
```

使用 `<DocLink>` 时，`dest` 不加 `/docs/`：

```mdx
<DocLink dest="cpp/container/vector/capacity">capacity</DocLink>
```

规则：

- 使用 `normalizedHref`，不得输出源相对 `.html` URL。
- 保留源链接可见文本，不得擅自改名。
- 链接文字是代码标识符时使用反引号，并保持代码样式。
- 目标页面暂未迁移不构成删除链接的理由。

### 12.2 Fragment 与外部链接

- `#Section` 形式的 fragment 保留。
- 真正的外部 HTTP(S) URL 原样保留。
- 非 HTTP scheme 按提取结果作为外部目标保留。
- 不得把外部链接重写到本地，也不得把 cppreference 内部链接留在源站。

### 12.3 专用引用

- 标准头文件可使用 `<HeaderRef language="C++" name="vector" />`。
- WG21 paper 可使用 `<PaperLink paper="P1234R0" />`。
- 只有源页面确实表达该语义时使用专用组件。

## 13. 代码、示例和输出

- C 使用 ` ```c `，C++ 使用 ` ```cpp `，纯输出使用 ` ```text `。
- 代码内容必须来自 `immutable.code`，不得由 Agent重新格式化或“修正”。
- 保留 include、类型参数、注释、空行、标点、字符字面量和输出。
- 示例的 “Run this code” 等源站控件文本不需要迁移；实际代码、说明和输出必须迁移。
- 代码块使用共享语法高亮表面，无边框、无阴影。
- 代码块不得固定最大高度或产生内部纵向滚动条。
- 长代码行按项目共享规则换行或提供局部可访问处理；不得造成整页水平溢出。
- 不得把多行示例写入普通 `<code>`。
- 不得把声明代码块当普通示例；声明使用 Declaration 组件。

## 14. 缺陷报告

缺陷报告使用完整结构：

```mdx
<DefectReportList>
  <DefectReport kind="lwg" id={464} standard="C++98">
    <PublishedBehavior>access to the underlying storage of an empty `vector` resulted in UB</PublishedBehavior>
    <CorrectedBehavior>`data` function provided</CorrectedBehavior>
  </DefectReport>
</DefectReportList>
```

规则：

- `kind` 只能来自源数据，当前为 `cwg` 或 `lwg`。
- `id`、`standard` 不得修改。
- 每个报告必须同时保留 Published 和 Corrected。
- 保持报告顺序。
- Published/Corrected 内容不得概括。
- 代码标识符继续使用反引号。
- `vector`、`T`、`data` 等缺陷报告中的代码使用与描述列表相同的绿色等宽字体、字号和粗细。
- 缺陷报告使用统一的平面行布局和分隔线，不使用带外框的卡片。
- Published 与 Corrected 是行内结构标签，不创建嵌套卡片或盒子。

## 15. Feature-test macros

- feature-test macro 区域使用普通 Markdown 表格。
- 宏名和数值使用反引号。
- 精确保留宏名、数值、标准和 feature 描述。
- 多个标准值不得合并成一个推断范围。
- 不创建 `FeatureTestMacro` 页面组件；当前注册契约明确使用普通表格。

## 16. 行为术语与技术引用

- well-defined、implementation-defined、unspecified、undefined、ill-formed、ill-formed no diagnostic required 等术语只有在源语义明确时才使用 `<BehaviorTerm>`。
- 不得仅根据关键词猜测行为分类。
- 类型、函数、对象、成员、表达式、宏和代码常量使用反引号。
- 一般英语词汇不使用反引号或绿色代码样式。

## 17. MDX 安全与语法

- 比较运算符在普通 MDX 文本中使用安全转义，如 `\<`、`\<=`；不得向读者显示 `&lt;`。
- JSX prop 中的字符串使用双引号。
- 多行代码 prop 使用 template literal，并确保反引号和 `${` 不破坏表达式。
- 不得使用 Fumadocs 当前解析器不支持的 Markdown 标题锚点语法。
- 不得把数学 LaTeX 直接写入尚未配置数学插件的 MDX；复杂度可保留为代码形式 `O(1)`、`O(n)`。
- 组件必须正确闭合，父子层级必须符合注册契约。
- JSX 与 Markdown 混排时必须保留必要空行，避免内容被解析为纯文本。
- 不得在 MDX 中引入运行时代码、数据抓取或副作用。

## 18. Agent 行为规则

### 18.1 强制阅读

任何迁移 Agent 在处理页面前必须读取：

1. `AGENTS.md`；
2. `MIGRATION_RULES.md`；
3. `packages/migrate/src/component-registry.ts` 中由程序注入的注册契约。

未完成规则读取不得生成候选输出。

### 18.2 Agent 可以做的事

- 识别源 block 的语义角色；
- 把普通 HTML 结构转换为 Markdown；
- 选择已注册语义组件；
- 组织完整的父子组件结构；
- 根据提取证据放置版本范围；
- 使用规范化链接目标；
- 在明确无法无损表示时标记人工复核。

### 18.3 Agent 不得做的事

- 使用模型知识补写源页面没有的内容；
- 改写或总结技术说明；
- 创建新组件；
- 输出普通源 HTML；
- 发明链接、版本、缺陷报告、声明编号或标题锚点；
- 删除暂时无法迁移的块；
- 为了通过验证而重复不可见文本；
- 把 `needs_review` 当作可发布状态；
- 在一次迁移中顺手重新设计全站组件或样式。

### 18.4 歧义处理

遇到以下情况必须停止该语义对象的发布并进入复核：

- 无法确定版本作用域；
- 表格合并关系无法由现有结构表达；
- 一个源 block 同时混合多个无法安全拆分的语义对象；
- 目标 slug 缺失或映射为 `null`；
- 源代码与可见文本矛盾；
- 组件契约无法保留源关系；
- 验证器报告无法通过内容修复消除。

## 19. 验证规则

### 19.1 覆盖错误

- `missing-source`：源 ID 或源可见文本缺失。
- `duplicate-source`：同一源 ID 被覆盖多次。
- `unknown-source`：输出包含 IR 中不存在的 ID。
- `order-mismatch`：覆盖顺序与源不一致。

这些都是发布阻断错误。

### 19.2 不可变事实错误

- `missing-code`：不可变代码未保留。
- `missing-link`：规范化目标或链接文字缺失。
- `missing-inline-revision`：行内版本范围缺失或被压平。
- `missing-revision`：标准版本标记缺失。
- `missing-table-span`：重要的合并单元格关系缺失。

修复方式只能是恢复相应事实或修正提取/验证逻辑。不得删除源证据或泛化验证器。

### 19.3 原始 HTML 与复核错误

- `<SourceHtml>`、`dangerouslySetInnerHTML`、`script`、`style` 是直接 MDX 的阻断项。
- `unsupported-pattern` 必须设置 `needsReview`，且不能作为正式发布结果。
- 当前验证器未覆盖的视觉或编译错误仍必须通过构建和浏览器检查发现。

### 19.4 验证结果解释

- `coveredCount === sourceCount` 只证明 ID 覆盖，不证明内容正确。
- `report.ok === true` 也不替代 MDX 编译和浏览器检查。
- 文本归一化可能发现不了错误组件边界、错误视觉层级或错误交互；必须人工审查。
- 若验证器产生明确误报，应以最小复现修复验证器并增加行为测试；禁止仅为某一页面加特例。

## 20. 浏览器视觉与交互检查

每个新页面至少检查：

### 20.1 桌面

- 页面标题、侧边导航、目录和章节完整。
- 声明编号、代码、版本标签正确对齐。
- 声明代码存在语法高亮。
- 所有两列语义列表使用相同字号、行高、列宽、字重和分隔线。
- 行内代码为绿色平面文字，无框、无 chip 背景。
- 行内版本只有一个胶囊，文字居中。
- 缺陷报告无卡片外框，代码样式与其他语义列表一致。
- 表格无不必要外框或盒状单元格。
- 页面无警告、报错、重叠或截断。
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`。

### 20.2 窄屏

- 语义两列布局可重排为一列。
- 声明、版本标签和长标识符仍可读。
- 页面无整页水平滚动。
- 导航、搜索、主题切换等既有交互没有被页面内容破坏。
- 链接和复制按钮可聚焦、可点击。

### 20.3 内容抽查

至少从页面开头、中部和结尾各抽查一个源 block，对照源 HTML 或 IR 核验：

- 文本；
- 代码；
- 链接；
- 版本作用域；
- 条目顺序；
- 标题层级。

## 21. 禁止的修复方式

以下做法即使让构建或验证通过，也属于迁移失败：

- 把缺失源文本藏在注释、ARIA 文本或不可见节点中；
- 重复一整段源文本只为满足 substring 验证；
- 把所有复杂结构降级成 `<SourceHtml>`；
- 删除验证失败的链接、版本或代码；
- 把 `sourceId` 标记集中到无关位置；
- 修改验证器使当前页面被跳过；
- 用 CSS 隐藏结构错误；
- 创建只服务单页的组件；
- 用截图代替可访问内容；
- 把未完成页面称为已迁移。

## 22. 新组件准入

只有满足全部条件才能新增组件：

- 该语义在多个 C/C++ 页面重复出现；
- 普通 Markdown 无法保留其关系；
- 现有注册组件无法表达；
- 接口体现领域语义而不是布局；
- 可由 Page IR 建模并由验证器核验；
- 有响应式、可访问性和视觉契约；
- 已更新 `component-registry.ts`、MDX 注册表、Agent 规则、渲染器和测试。

不得新增 `FlexTable`、`CardGrid` 等仅描述布局的迁移组件。

## 23. 页面提交检查表

### 来源与路径

- [ ] 源 HTML 路径正确。
- [ ] 目标 slug 与映射一致。
- [ ] frontmatter 的 title、description、source_url、language 正确。
- [ ] 页面和父目录导航元数据已更新。

### 保真

- [ ] 所有 `sourceId` 恰好覆盖一次且顺序一致。
- [ ] 可见技术文本完整。
- [ ] 所有不可变代码完整。
- [ ] 链接文字和规范化目标完整。
- [ ] 行内与块级版本作用域准确。
- [ ] 声明编号与说明编号一一对应。
- [ ] 表格关系、宏值和缺陷报告完整。

### 组件与 MDX

- [ ] 普通结构使用 Markdown。
- [ ] 声明、描述列表、参数、版本和缺陷报告使用正确组件。
- [ ] 未使用 raw HTML、页面 import、局部组件或未注册组件。
- [ ] 代码标识符使用反引号；普通强调未滥用反引号。
- [ ] 内部链接使用 `/docs/` 路由或正确的 `DocLink dest`。

### 视觉

- [ ] 声明编号居中。
- [ ] 声明版本在右侧胶囊内居中。
- [ ] 行内版本正文范围完整覆盖；`since C++xx` 仍是独立的单层居中胶囊，正文覆盖不侵入胶囊。
- [ ] 两列语义列表字号、字重、列宽和分隔线统一。
- [ ] 左右列代码字体、字号、行高和粗细一致。
- [ ] 行内代码为绿色平面文字，无框、背景、圆角或阴影。
- [ ] 缺陷报告为平面列表，代码样式一致。
- [ ] 桌面和窄屏无水平溢出、重叠或截断。

### 验证

- [ ] `validate-mdx` 已运行并审查报告。
- [ ] `bun run typecheck` 通过。
- [ ] `bun test` 通过。
- [ ] `bun run build` 通过。
- [ ] 目标路由已在浏览器实际打开。
- [ ] 页面无 alert、运行时错误或控制台错误。
- [ ] 已对照源数据抽查页面开头、中部和结尾。

## 24. 参考实现

当前可作为结构和视觉参考的完整容器页面：

```text
apps/docs/content/docs/cpp/container/vector.mdx
```

参考时只能复用其组件边界和版式规则。具体内容、版本、链接、声明数量和章节必须始终来自正在迁移页面自身的 Lossless Page IR。
