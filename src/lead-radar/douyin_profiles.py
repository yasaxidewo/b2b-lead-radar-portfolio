from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from media_platform.xhs.lead_radar.config import (
    COMPETITOR_INTERCEPTION,
    GENERAL_SELECTION,
    INDUSTRY_DEMAND,
    MANUAL,
)
from media_platform.comment_collection.industry_profiles import industry_query_items
from media_platform.xhs.lead_radar.query_planner import QueryPlan


DOUYIN_COMPETITOR_PROFILES: tuple[dict[str, Any], ...] = (
    {
        "id": "xiaoe",
        "name": "小鹅通",
        "search_name": "小鹅通",
        "aliases": ["小鹅通"],
        "core_queries": [
            "小鹅通", "小鹅通怎么样", "小鹅通收费", "小鹅通续费",
            "小鹅通客服", "小鹅通知识付费", "小鹅通直播", "小鹅通开店",
            "小鹅通避坑", "小鹅通换平台",
        ],
        "experiment_queries": [
            "小鹅通不好用", "小鹅通涨价", "小鹅通后台", "小鹅通数据导出",
            "小鹅通课程", "小鹅通私域", "小鹅通替代", "小鹅通迁移",
        ],
    },
    {
        "id": "weizan",
        "name": "微赞",
        "search_name": "微赞直播",
        "aliases": ["微赞直播", "微赞"],
        "core_queries": [
            "微赞直播", "微赞直播怎么样", "微赞直播收费", "微赞直播价格",
            "微赞直播客服", "微赞直播续费", "微赞直播私域", "微赞直播卡顿",
            "微赞直播避坑", "微赞直播不好用",
        ],
        "experiment_queries": [
            "微赞直播卖课", "微赞直播带货", "微赞直播数据导出",
            "微赞直播后台", "微赞直播年费", "微赞直播稳定性",
            "微赞直播替代", "微赞涨价",
        ],
    },
    {
        "id": "vhall",
        "name": "微吼",
        "search_name": "微吼直播",
        "aliases": ["微吼直播", "微吼"],
        "core_queries": [
            "微吼直播", "微吼企业直播", "微吼直播收费", "微吼直播价格",
            "微吼直播客服", "微吼直播卡顿", "微吼直播稳定性",
            "微吼活动直播", "微吼会议直播", "微吼直播技术支持",
        ],
        "experiment_queries": [
            "微吼直播续费", "微吼直播API", "微吼直播数据", "微吼直播培训",
            "微吼直播替代", "微吼直播避坑", "微吼直播不好用",
        ],
    },
    {
        "id": "mudu",
        "name": "目睹直播",
        "search_name": "目睹直播",
        "aliases": ["目睹直播"],
        "core_queries": [
            "目睹直播", "目睹企业直播", "目睹活动直播", "目睹发布会直播",
            "目睹直播收费", "目睹直播价格", "目睹直播客服", "目睹直播卡顿",
            "目睹直播技术支持", "目睹直播数据",
        ],
        "experiment_queries": [
            "目睹直播大并发", "目睹直播API", "目睹直播培训", "目睹直播续费",
            "目睹直播替代", "目睹直播避坑", "目睹直播不好用",
        ],
    },
    {
        "id": "baijiayun",
        "name": "百家云",
        "search_name": "百家云直播",
        "aliases": ["百家云直播", "百家云"],
        "core_queries": [
            "百家云直播", "百家云网校", "百家云在线课堂", "百家云直播课",
            "百家云直播收费", "百家云直播客服", "百家云直播卡顿",
            "百家云直播稳定性", "百家云直播技术支持", "百家云直播数据",
        ],
        "experiment_queries": [
            "百家云直播价格", "百家云直播续费", "百家云直播API",
            "百家云直播替代", "百家云直播避坑", "百家云直播不好用",
            "百家云音视频",
        ],
    },
)

DOUYIN_GENERAL_SELECTION_PROFILE: dict[str, list[str]] = {
    "core_queries": [
        "企业直播平台", "企业直播怎么做", "企业直播方案", "企业直播报价",
        "企业培训直播", "公司内部直播", "发布会直播", "活动直播服务",
        "私域直播软件", "知识付费平台", "培训直播平台", "直播系统API",
    ],
    "experiment_queries": [
        "企业直播怎么选", "企业直播平台推荐", "企业直播系统",
        "直播平台私有化", "直播系统SDK", "直播嵌入官网", "直播嵌入小程序",
        "活动直播大并发", "直播平台数据安全", "课程直播防盗",
        "经销商培训直播", "学校直播平台", "直播平台数据导出",
        "直播权限观看",
    ],
}

DOUYIN_COMPETITORS_BY_ID = {
    str(profile["id"]): profile for profile in DOUYIN_COMPETITOR_PROFILES
}


class DouyinQueryPlanner:
    """Build finite Douyin-only query plans without Cartesian expansion."""

    def __init__(
        self,
        *,
        competitor_ids: Sequence[str] | None = None,
        industry_ids: Sequence[str] | None = None,
        enabled_source_types: Sequence[str] | None = None,
        include_experiment_queries: bool = False,
        configured_queries: Sequence[Mapping[str, Any] | str] | None = None,
        default_max_awemes: int = 5,
    ) -> None:
        self.competitor_ids = list(dict.fromkeys(competitor_ids or []))
        self.industry_ids = list(dict.fromkeys(industry_ids or []))
        self.enabled_source_types = list(
            dict.fromkeys(
                enabled_source_types or [COMPETITOR_INTERCEPTION]
            )
        )
        self.include_experiment_queries = bool(
            include_experiment_queries
        )
        self.configured_queries = list(configured_queries or [])
        self.default_max_awemes = max(1, min(int(default_max_awemes), 20))

    def _defaults(self) -> list[dict[str, Any]]:
        values: list[dict[str, Any]] = []
        if COMPETITOR_INTERCEPTION in self.enabled_source_types:
            for competitor_id in self.competitor_ids:
                profile = DOUYIN_COMPETITORS_BY_ID.get(competitor_id)
                if not profile:
                    continue
                for query in profile["core_queries"]:
                    values.append(
                        {
                            "query_text": query,
                            "query_group": "core",
                            "source_type": COMPETITOR_INTERCEPTION,
                            "target_competitor": competitor_id,
                        }
                    )
                if self.include_experiment_queries:
                    for query in profile["experiment_queries"]:
                        values.append(
                            {
                                "query_text": query,
                                "query_group": "experiment",
                                "source_type": COMPETITOR_INTERCEPTION,
                                "target_competitor": competitor_id,
                            }
                        )
        if GENERAL_SELECTION in self.enabled_source_types:
            for query in DOUYIN_GENERAL_SELECTION_PROFILE["core_queries"]:
                values.append(
                    {
                        "query_text": query,
                        "query_group": "core",
                        "source_type": GENERAL_SELECTION,
                        "target_competitor": None,
                    }
                )
            if self.include_experiment_queries:
                for query in DOUYIN_GENERAL_SELECTION_PROFILE[
                    "experiment_queries"
                ]:
                    values.append(
                        {
                            "query_text": query,
                            "query_group": "experiment",
                            "source_type": GENERAL_SELECTION,
                            "target_competitor": None,
                        }
                    )
        if INDUSTRY_DEMAND in self.enabled_source_types:
            values.extend(industry_query_items(self.industry_ids))
        return values

    def build(self) -> list[QueryPlan]:
        source = self.configured_queries or self._defaults()
        plans: list[QueryPlan] = []
        seen: set[str] = set()
        for raw in source:
            item = {"query_text": raw} if isinstance(raw, str) else dict(raw)
            query = str(
                item.get("query_text") or item.get("query") or ""
            ).strip()
            if not query or query in seen:
                continue
            source_type = str(
                item.get("source_type")
                or (
                    GENERAL_SELECTION
                    if self.enabled_source_types == [GENERAL_SELECTION]
                    else MANUAL
                )
            )
            if source_type not in {
                COMPETITOR_INTERCEPTION,
                GENERAL_SELECTION,
                INDUSTRY_DEMAND,
                MANUAL,
            }:
                continue
            target = item.get("target_competitor")
            if source_type in {GENERAL_SELECTION, INDUSTRY_DEMAND}:
                target = None
            target_industry = item.get("target_industry")
            industry_category = item.get("industry_category")
            if source_type != INDUSTRY_DEMAND:
                target_industry = None
                industry_category = None
            try:
                max_awemes = max(
                    1,
                    min(
                        int(
                            item.get(
                                "max_notes", self.default_max_awemes
                            )
                        ),
                        20,
                    ),
                )
            except (TypeError, ValueError):
                max_awemes = self.default_max_awemes
            group = str(item.get("query_group") or "manual")
            if group not in {
                "core", "experiment", "manual", "broad", "scenario", "constraint"
            }:
                group = "manual"
            seen.add(query)
            plans.append(
                QueryPlan(
                    query_text=query,
                    max_notes=max_awemes,
                    source_type=source_type,
                    target_competitor=str(target) if target else None,
                    platform="dy",
                    query_group=group,
                    target_industry=(
                        str(target_industry) if target_industry else None
                    ),
                    industry_category=(
                        str(industry_category) if industry_category else None
                    ),
                )
            )
        return plans
