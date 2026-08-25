# 系统架构

## 设计原则

1. 搜索配置、页面预览和实际任务尽量使用同一份数据；
2. 先判断内容相关度，再决定是否抓评论，减少无效请求；
3. 原始数据、分类结果和人工审核状态分层保存；
4. 以平台和评论 ID 作为主要去重键，不用昵称或文本猜测身份；
5. 触达是人工审核流程，不是无人值守群发；
6. 遇到平台验证或账号风险时保存已有结果并停止。

## 逻辑结构

```mermaid
flowchart TB
    subgraph Configuration[搜索配置层]
      A1[竞品截流]
      A2[泛选型需求]
      A3[行业需求]
      A4[手动增删关键词]
    end

    subgraph Collection[采集层]
      B1[小红书适配]
      B2[抖音适配]
      B3[搜索结果与详情]
      B4[一级/二级评论]
    end

    subgraph Intelligence[判断与数据层]
      C1[帖子相关度]
      C2[评论上下文]
      C3[线索分类]
      C4[SQLite评论注册表]
      C5[CSV/Excel导出]
    end

    subgraph Outreach[人工触达层]
      D1[名单导入与字段检查]
      D2[人工编辑与批准]
      D3[原评论/主页定位]
      D4[执行状态与复核]
    end

    Configuration --> Collection
    Collection --> Intelligence
    Intelligence --> Outreach
```

## 关键数据对象

一条搜索关键词至少保留：

```json
{
  "query_text": "金融直播合规",
  "source_type": "industry_demand",
  "target_competitor": null,
  "target_industry": "finance"
}
```

一条评论进入后续流程时，重点保留：

```json
{
  "platform": "douyin",
  "comment_id": "demo_comment_001",
  "parent_comment_id": null,
  "content_id": "demo_video_001",
  "source_type": "industry_demand",
  "target_industry": "finance",
  "user_profile_url": "",
  "result_pool": "manual_review",
  "review_status": "not_published"
}
```

示例仅用于说明结构，不对应真实平台数据。

## 搜索词一致性

前端使用 `buildSearchQueries` 构造最终关键词数组，同一结果同时服务于：

- 页面搜索词预览；
- 顶部数量统计；
- 启动任务请求；
- 手动增加和删除关键词后的最终提交。

这样可以减少“页面看见一套、后台实际执行另一套”的状态分叉。

## 增量去重

SQLite 评论注册表用于记录已经处理过的 `(platform, comment_id)`。再次抓取同一内容时，系统比较评论标识和内容评论数变化，决定跳过、复查或写入新评论。

昵称、评论文本和匿名用户哈希不会被当作可靠的公开主页标识。

## 触达状态机

```mermaid
stateDiagram-v2
    [*] --> Imported
    Imported --> Incomplete: 定位字段缺失
    Imported --> Reviewed: 人工检查
    Reviewed --> Approved: 人工批准
    Approved --> Prepared: 定位并填入
    Prepared --> Published: 用户确认发布
    Published --> Verified: 页面复核成功
    Approved --> Blocked: 验证/频率限制/账号告警
    Prepared --> Uncertain: 发布结果不确定
    Uncertain --> Verified: 刷新状态确认
```

