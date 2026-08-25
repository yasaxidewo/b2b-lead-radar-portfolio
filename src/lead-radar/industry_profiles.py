from __future__ import annotations

from collections.abc import Sequence
from typing import Any


INDUSTRY_DEMAND = "industry_demand"

INDUSTRY_QUERY_GROUPS: tuple[dict[str, str], ...] = (
    {"id": "broad", "name": "泛行业词"},
    {"id": "scenario", "name": "业务场景词"},
    {"id": "constraint", "name": "约束需求词"},
)


# Douyin industry-demand relevance uses these terms after a search result has
# been returned.  Search queries and relevance rules intentionally live in the
# same module so every configured industry can be evaluated consistently.
INDUSTRY_LIVE_TERMS: tuple[str, ...] = (
    "直播",
    "直播间",
    "线上直播",
    "网络直播",
    "云直播",
    "视频会议",
    "在线会议",
)

INDUSTRY_SCENARIO_TERMS: tuple[str, ...] = (
    "内部培训",
    "员工培训",
    "经销商培训",
    "代理人培训",
    "医生培训",
    "技术培训",
    "安全培训",
    "网点培训",
    "会员培训",
    "投资者教育",
    "政策宣讲",
    "公共服务",
    "学术会议",
    "项目会议",
    "政务会议",
    "能源会议",
    "行业峰会",
    "发布会",
    "新品",
    "门店",
    "线上看车",
    "线上看房",
    "招商",
    "导购",
    "私域带货",
    "景区",
    "文旅活动",
    "产品推介",
    "公开课",
    "职业培训",
    "招生",
    "付费课程",
    "训练营",
    "会员社群",
    "访谈",
    "新书",
    "文化活动",
    "科普",
)

INDUSTRY_CONSTRAINT_TERMS: tuple[str, ...] = (
    "合规",
    "隐私",
    "资质",
    "认证",
    "报白",
    "审核",
    "违规",
    "封禁",
    "限流",
    "数据安全",
    "内容安全",
    "权限管理",
    "分级权限",
    "会员权限",
    "私有化",
    "内网部署",
    "数据统计",
    "数据分析",
    "系统对接",
    "多终端",
    "回放管理",
    "获客",
    "留资",
    "转化",
    "私域运营",
    "会员运营",
    "互动",
    "多平台分发",
    "防录屏",
    "防盗",
    "加密",
    "用户管理",
    "版权保护",
    "报名管理",
)

INDUSTRY_DEMAND_SIGNAL_TERMS: tuple[str, ...] = (
    "平台",
    "系统",
    "方案",
    "报价",
    "怎么做",
    "怎么选",
    "推荐",
    "API",
    "SDK",
    "接口",
    "采购",
    "部署",
    "对接",
    "稳定",
    "卡顿",
    "服务商",
)

INDUSTRY_ANCHOR_TERMS: dict[str, tuple[str, ...]] = {
    "finance": ("金融", "财经", "银行", "证券", "保险", "券商", "投顾", "理财"),
    "medical": ("医疗", "医院", "医生", "医学", "医美", "手术"),
    "pharma": ("医药", "药企", "药品", "药学", "制药"),
    "government": ("政务", "政府", "政务服务", "公共服务", "机关"),
    "manufacturing": ("制造", "制造业", "工厂", "生产", "车间", "工业"),
    "energy": ("能源", "电力", "电网", "石油", "石化", "煤炭", "新能源"),
    "logistics": ("物流", "交通", "运输", "快递", "仓储", "网点"),
    "construction": ("建筑", "工程", "施工", "工地", "项目"),
    "automotive": ("汽车", "车企", "车商", "4S店", "4s店", "新车", "看车"),
    "real_estate": ("房地产", "房产", "地产", "楼盘", "看房", "售楼"),
    "retail_ecommerce": ("零售", "电商", "品牌", "门店", "导购", "带货"),
    "tourism": ("文旅", "旅游", "景区", "酒店", "旅行", "民宿"),
    "education": ("教育", "学校", "高校", "院校", "职业培训", "招生", "公开课"),
    "knowledge_payment": ("知识付费", "付费课程", "讲师", "训练营", "会员社群", "网课"),
    "media_publishing": ("媒体", "出版", "出版社", "新书", "访谈", "文化活动"),
    "association": ("协会", "商会", "行业峰会"),
}

INDUSTRY_TOPIC_ONLY_TERMS: dict[str, tuple[str, ...]] = {
    "finance": ("A股", "股票", "大盘", "行情", "涨停", "个股", "买入", "卖出", "操盘", "基金"),
    "medical": ("养生", "保健", "症状", "问诊", "减肥", "食疗", "健康知识"),
    "pharma": ("药品功效", "用药方法", "药价"),
    "government": ("时政评论", "社会新闻"),
    "manufacturing": ("工厂日常", "生产过程"),
    "energy": ("油价", "电价", "能源行情"),
    "logistics": ("快递查询", "物流信息", "货运日常"),
    "construction": ("工地日常", "装修", "房屋设计"),
    "automotive": ("赛车", "汽车赛事", "改装", "车评"),
    "real_estate": ("房价", "楼市", "买房", "租房"),
    "retail_ecommerce": ("好物分享", "开箱", "个人带货"),
    "tourism": ("旅行日记", "旅游攻略", "风景", "探店"),
    "education": ("考试答案", "作业答案", "学习打卡"),
    "knowledge_payment": ("副业赚钱", "暴富"),
    "media_publishing": ("娱乐新闻", "追星", "八卦"),
    "association": (),
}

INDUSTRY_CATEGORIES: tuple[dict[str, Any], ...] = (
    {
        "id": "high_regulation",
        "name": "高监管行业",
        "description": "合规、安全、权限和内容审核要求较高",
        "industries": (
            {
                "id": "finance",
                "name": "金融",
                "query_groups": {
                    "broad": ["金融直播"],
                    "scenario": ["银行内部培训直播", "证券投资者教育直播", "保险代理人培训直播"],
                    "constraint": ["金融直播合规", "金融直播数据安全", "金融直播权限管理"],
                },
            },
            {
                "id": "medical",
                "name": "医疗",
                "query_groups": {
                    "broad": ["医疗直播"],
                    "scenario": ["医院学术会议直播", "医生培训直播", "医疗科普直播"],
                    "constraint": ["医疗直播隐私", "医疗直播数据安全", "医疗直播内容审核"],
                },
            },
            {
                "id": "pharma",
                "name": "医药",
                "query_groups": {
                    "broad": ["医药直播"],
                    "scenario": ["药企医生培训直播", "医药学术会议直播", "药企经销商培训直播"],
                    "constraint": ["医药直播合规", "医药直播内容审核", "医药直播数据安全"],
                },
            },
            {
                "id": "government",
                "name": "政务",
                "query_groups": {
                    "broad": ["政务直播"],
                    "scenario": ["政策宣讲直播", "政务会议直播", "公共服务直播"],
                    "constraint": ["政务直播安全", "政务直播权限管理", "政务直播私有化"],
                },
            },
        ),
    },
    {
        "id": "organization_training",
        "name": "组织培训行业",
        "description": "内部培训、协同沟通和渠道赋能需求突出",
        "industries": (
            {
                "id": "manufacturing",
                "name": "制造",
                "query_groups": {
                    "broad": ["制造业直播"],
                    "scenario": ["工厂员工培训直播", "制造业经销商培训直播", "新品技术培训直播"],
                    "constraint": ["制造业直播权限管理", "制造业直播数据统计", "制造业直播系统对接"],
                },
            },
            {
                "id": "energy",
                "name": "能源",
                "query_groups": {
                    "broad": ["能源行业直播"],
                    "scenario": ["能源企业安全培训直播", "电力技术培训直播", "能源会议直播"],
                    "constraint": ["能源直播内网部署", "能源直播权限管理", "能源直播数据安全"],
                },
            },
            {
                "id": "logistics",
                "name": "交通物流",
                "query_groups": {
                    "broad": ["物流行业直播"],
                    "scenario": ["物流员工培训直播", "交通安全培训直播", "物流网点培训直播"],
                    "constraint": ["物流直播多终端观看", "物流直播权限管理", "物流直播数据统计"],
                },
            },
            {
                "id": "construction",
                "name": "建筑工程",
                "query_groups": {
                    "broad": ["建筑行业直播"],
                    "scenario": ["建筑安全培训直播", "工程项目会议直播", "施工技术培训直播"],
                    "constraint": ["建筑直播分级权限", "建筑直播回放管理", "建筑直播数据统计"],
                },
            },
        ),
    },
    {
        "id": "marketing_conversion",
        "name": "营销转化行业",
        "description": "获客、产品讲解、活动传播和销售转化需求突出",
        "industries": (
            {
                "id": "automotive",
                "name": "汽车",
                "query_groups": {
                    "broad": ["汽车直播"],
                    "scenario": ["汽车发布会直播", "汽车门店直播", "汽车线上看车直播"],
                    "constraint": ["汽车直播获客", "汽车直播留资", "汽车直播数据分析"],
                },
            },
            {
                "id": "real_estate",
                "name": "房地产",
                "query_groups": {
                    "broad": ["房地产直播"],
                    "scenario": ["楼盘发布会直播", "房产线上看房直播", "地产招商直播"],
                    "constraint": ["房地产直播获客", "房产直播留资", "房地产直播私域运营"],
                },
            },
            {
                "id": "retail_ecommerce",
                "name": "零售电商",
                "query_groups": {
                    "broad": ["零售直播"],
                    "scenario": ["品牌新品直播", "门店导购直播", "私域带货直播"],
                    "constraint": ["零售直播转化", "零售直播会员运营", "零售直播数据分析"],
                },
            },
            {
                "id": "tourism",
                "name": "旅游文旅",
                "query_groups": {
                    "broad": ["文旅直播"],
                    "scenario": ["景区直播", "文旅活动直播", "旅游产品推介直播"],
                    "constraint": ["文旅直播获客", "文旅直播互动", "文旅直播多平台分发"],
                },
            },
        ),
    },
    {
        "id": "content_services",
        "name": "内容服务行业",
        "description": "知识交付、内容传播、会员运营和版权保护需求突出",
        "industries": (
            {
                "id": "education",
                "name": "教育",
                "query_groups": {
                    "broad": ["教育直播"],
                    "scenario": ["高校公开课直播", "职业培训直播", "院校招生直播"],
                    "constraint": ["教育直播内容安全", "教育直播防录屏", "教育直播权限管理"],
                },
            },
            {
                "id": "knowledge_payment",
                "name": "知识付费",
                "query_groups": {
                    "broad": ["知识付费直播"],
                    "scenario": ["付费课程直播", "讲师训练营直播", "会员社群直播"],
                    "constraint": ["课程直播防盗", "知识付费直播加密", "知识付费直播用户管理"],
                },
            },
            {
                "id": "media_publishing",
                "name": "媒体出版",
                "query_groups": {
                    "broad": ["媒体直播"],
                    "scenario": ["媒体访谈直播", "新书发布会直播", "文化活动直播"],
                    "constraint": ["媒体直播版权保护", "媒体直播多平台分发", "媒体直播回放管理"],
                },
            },
            {
                "id": "association",
                "name": "协会商会",
                "query_groups": {
                    "broad": ["协会直播"],
                    "scenario": ["行业峰会直播", "协会会员培训直播", "商会活动直播"],
                    "constraint": ["协会直播会员权限", "协会直播报名管理", "协会直播数据统计"],
                },
            },
        ),
    },
)


def _flatten_industries() -> tuple[dict[str, Any], ...]:
    values: list[dict[str, Any]] = []
    for category in INDUSTRY_CATEGORIES:
        for industry in category["industries"]:
            values.append(
                {
                    **industry,
                    "category_id": category["id"],
                    "category_name": category["name"],
                }
            )
    return tuple(values)


INDUSTRY_PROFILES = _flatten_industries()
# Kept as a compatibility alias for callers from v3.3.x.
HIGH_REGULATION_INDUSTRIES = INDUSTRY_PROFILES
INDUSTRIES_BY_ID = {
    str(industry["id"]): industry for industry in INDUSTRY_PROFILES
}


def industry_query_items(
    industry_ids: Sequence[str] | None = None,
) -> list[dict[str, Any]]:
    selected_ids = list(dict.fromkeys(industry_ids or INDUSTRIES_BY_ID.keys()))
    items: list[dict[str, Any]] = []
    for industry_id in selected_ids:
        profile = INDUSTRIES_BY_ID.get(industry_id)
        if not profile:
            continue
        for query_group in ("broad", "scenario", "constraint"):
            for query_text in profile["query_groups"].get(query_group, []):
                items.append(
                    {
                        "query_text": query_text,
                        "query_group": query_group,
                        "source_type": INDUSTRY_DEMAND,
                        "target_competitor": None,
                        "target_industry": industry_id,
                        "industry_category": profile["category_id"],
                    }
                )
    return items
