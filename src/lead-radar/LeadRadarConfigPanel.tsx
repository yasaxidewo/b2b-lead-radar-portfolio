import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Plus, Radar, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { leadRadarApi } from '@/lib/api'
import { buildSearchQueries } from '@/lib/leadRadarQueries'
import { useCrawlerStore } from '@/store/crawlerStore'
import type { LeadSourceType } from '@/types/crawler'


export function LeadRadarConfigPanel({ disabled }: { disabled: boolean }) {
  const config = useCrawlerStore((state) => state.config)
  const updateConfig = useCrawlerStore((state) => state.updateConfig)
  const selectedIndustryCategoryIds = config.selected_industry_category_ids ?? []
  const selectedIndustryIds = config.selected_industry_ids ?? []
  const initializedPlatform = useRef('')
  const sourceSelectionTouched = useRef(false)
  const [newQuery, setNewQuery] = useState('')
  const [industryExpanded, setIndustryExpanded] = useState(false)
  const { data: defaults } = useQuery({
    queryKey: ['leadRadarDefaults', config.platform],
    queryFn: async () => (
      await leadRadarApi.getDefaults(config.platform as 'xhs' | 'dy')
    ).data,
    enabled: config.platform === 'xhs' || config.platform === 'dy',
    staleTime: Infinity,
  })
  const industryCategories = defaults?.industry_categories ?? []

  const defaultQueryPlans = (
    enabledSourceTypes: readonly LeadSourceType[],
    selectedCompetitorIds: readonly string[],
    includeExperimentQueries: boolean,
    selectedIndustryIds: readonly string[] = defaults?.selected_industry_ids ?? [],
  ) => {
    if (!defaults) return []
    const plansBySourceType = Object.fromEntries(
      (['competitor_interception', 'general_selection', 'industry_demand'] as const).map(
        (sourceType) => [
          sourceType,
          [
            ...(defaults.query_plans_by_source_type[sourceType] ?? []),
            ...(includeExperimentQueries
              ? defaults.experiment_query_plans_by_source_type[sourceType] ?? []
              : []),
          ],
        ],
      ),
    )
    return buildSearchQueries(
      {
        platform: config.platform as 'xhs' | 'dy',
        enabledSourceTypes,
        selectedCompetitorIds,
        selectedIndustryIds,
        queryPlansBySourceType: plansBySourceType,
      },
      defaults.competitors,
    )
  }

  useEffect(() => {
    if (!defaults || defaults.platform !== config.platform) return
    if (initializedPlatform.current === config.platform) return
    initializedPlatform.current = config.platform
    sourceSelectionTouched.current = false
    const currentConfig = useCrawlerStore.getState().config
    const enabledSourceTypes = sourceSelectionTouched.current
      ? currentConfig.enabled_source_types
      : defaults.enabled_source_types
    const selectedCompetitorIds = defaults.selected_competitor_ids
    const selectedIndustryCategoryIds = defaults.selected_industry_category_ids ?? []
    const selectedIndustryIds = defaults.selected_industry_ids ?? []
    const selectedCompetitorSet = new Set(selectedCompetitorIds)
    const competitors = defaults.competitors.map((competitor) => ({
      ...competitor,
      enabled: selectedCompetitorSet.has(competitor.id),
    }))
    updateConfig({
      enabled_source_types: enabledSourceTypes,
      selected_competitor_ids: selectedCompetitorIds,
      selected_industry_category_ids: selectedIndustryCategoryIds,
      selected_industry_ids: selectedIndustryIds,
      competitors,
      query_plans: buildSearchQueries(
        {
          platform: config.platform as 'xhs' | 'dy',
          enabledSourceTypes,
          selectedCompetitorIds,
          selectedIndustryIds,
          queryPlansBySourceType: defaults.query_plans_by_source_type,
        },
        competitors,
      ),
      max_notes_per_query: defaults.max_notes_per_query,
      max_comments_per_note: defaults.max_comments_per_note,
      minimum_candidate_score: defaults.minimum_candidate_score,
      collection_mode: defaults.collection_mode,
      collection_strategy: defaults.collection_strategy,
      include_experiment_queries: defaults.include_experiment_queries,
      note_recheck_interval_days: defaults.note_recheck_interval_days,
      dy_search_sort_type: defaults.dy_search_sort_type,
      dy_search_publish_time_type: defaults.dy_search_publish_time_type,
      dy_search_detail_candidate_max: defaults.dy_search_detail_candidate_max,
      dy_comment_fetch_video_max_per_query: defaults.dy_comment_fetch_video_max_per_query,
      dy_unknown_comment_exploration_max: defaults.dy_unknown_comment_exploration_max,
      dy_high_first_level_comment_limit: defaults.dy_high_first_level_comment_limit,
      dy_medium_first_level_comment_limit: defaults.dy_medium_first_level_comment_limit,
      dy_high_sub_comment_total_limit: defaults.dy_high_sub_comment_total_limit,
      dy_medium_sub_comment_total_limit: defaults.dy_medium_sub_comment_total_limit,
      dy_sub_comment_limit_per_parent: defaults.dy_sub_comment_limit_per_parent,
    })
  }, [config.platform, defaults, updateConfig])

  const toggleSourceType = (sourceType: LeadSourceType, checked: boolean) => {
    sourceSelectionTouched.current = true
    const currentConfig = useCrawlerStore.getState().config
    const enabledSourceTypes = checked
      ? Array.from(new Set([...currentConfig.enabled_source_types, sourceType]))
      : currentConfig.enabled_source_types.filter((value) => value !== sourceType)
    const selectedCompetitorIds = currentConfig.selected_competitor_ids
    const selectedIndustryCategoryIds = currentConfig.selected_industry_category_ids ?? []
    const currentIndustryIds = currentConfig.selected_industry_ids ?? []
    const selectedIndustryIds = currentIndustryIds
    const selectedCompetitorSet = new Set(selectedCompetitorIds)
    const competitors = (defaults?.competitors ?? currentConfig.competitors).map(
      (competitor) => ({
        ...competitor,
        enabled: selectedCompetitorSet.has(competitor.id),
      }),
    )
    const queryPlans = defaults
      ? defaultQueryPlans(
          enabledSourceTypes,
          selectedCompetitorIds,
          currentConfig.include_experiment_queries,
          selectedIndustryIds,
        )
      : buildSearchQueries(
          {
            platform: config.platform as 'xhs' | 'dy',
            enabledSourceTypes,
            selectedCompetitorIds,
            selectedIndustryIds,
            queryPlans: currentConfig.query_plans,
          },
          competitors,
        )
    updateConfig({
      enabled_source_types: enabledSourceTypes,
      selected_competitor_ids: selectedCompetitorIds,
      selected_industry_category_ids: selectedIndustryCategoryIds,
      selected_industry_ids: selectedIndustryIds,
      competitors,
      query_plans: queryPlans,
    })
  }

  const applyCompetitorSelection = (competitorIds: readonly string[]) => {
    if (!defaults) return
    const requestedIds = new Set(competitorIds)
    const selectedCompetitorIds = defaults.competitors
      .filter((competitor) => requestedIds.has(competitor.id))
      .map((competitor) => competitor.id)
    const selectedCompetitorSet = new Set(selectedCompetitorIds)
    const competitors = defaults.competitors.map((competitor) => ({
      ...competitor,
      enabled: selectedCompetitorSet.has(competitor.id),
    }))
    const currentConfig = useCrawlerStore.getState().config
    updateConfig({
      selected_competitor_ids: selectedCompetitorIds,
      competitors,
      query_plans: buildSearchQueries(
        {
          platform: config.platform as 'xhs' | 'dy',
          enabledSourceTypes: currentConfig.enabled_source_types,
          selectedCompetitorIds,
          queryPlans: defaultQueryPlans(
            currentConfig.enabled_source_types,
            selectedCompetitorIds,
            currentConfig.include_experiment_queries,
            currentConfig.selected_industry_ids ?? [],
          ),
        },
        competitors,
      ),
    })
  }

  const toggleExperimentQueries = (checked: boolean) => {
    if (!defaults) return
    const currentConfig = useCrawlerStore.getState().config
    const manualPlans = currentConfig.query_plans.filter(
      (plan) => plan.source_type === 'manual',
    )
    updateConfig({
      include_experiment_queries: checked,
      query_plans: [
        ...defaultQueryPlans(
          currentConfig.enabled_source_types,
          currentConfig.selected_competitor_ids,
          checked,
          currentConfig.selected_industry_ids ?? [],
        ),
        ...manualPlans,
      ],
    })
  }

  const toggleCompetitor = (competitorId: string, checked: boolean) => {
    const currentSelectedCompetitorIds =
      useCrawlerStore.getState().config.selected_competitor_ids
    const selectedCompetitorIds = checked
      ? [...currentSelectedCompetitorIds, competitorId]
      : currentSelectedCompetitorIds.filter((value) => value !== competitorId)
    applyCompetitorSelection(selectedCompetitorIds)
  }

  const applyIndustrySelection = (industryIds: readonly string[]) => {
    if (!defaults) return
    const selectedCategorySet = new Set(
      useCrawlerStore.getState().config.selected_industry_category_ids ?? [],
    )
    const availableIds = new Set(
      industryCategories
        .filter((category) => selectedCategorySet.has(category.id))
        .flatMap((category) =>
          category.industries.map((industry) => industry.id),
        ),
    )
    const selectedIndustryIds = Array.from(new Set(industryIds)).filter((id) =>
      availableIds.has(id),
    )
    const currentConfig = useCrawlerStore.getState().config
    updateConfig({
      selected_industry_ids: selectedIndustryIds,
      query_plans: defaultQueryPlans(
        currentConfig.enabled_source_types,
        currentConfig.selected_competitor_ids,
        currentConfig.include_experiment_queries,
        selectedIndustryIds,
      ),
    })
  }

  const applyIndustryCategorySelection = (categoryIds: readonly string[]) => {
    if (!defaults) return
    const requestedIds = new Set(categoryIds)
    const selectedIndustryCategoryIds = industryCategories
      .filter((category) => requestedIds.has(category.id))
      .map((category) => category.id)
    const selectedCategorySet = new Set(selectedIndustryCategoryIds)
    const availableIndustryIds = new Set(
      industryCategories
        .filter((category) => selectedCategorySet.has(category.id))
        .flatMap((category) => category.industries.map((industry) => industry.id)),
    )
    const currentConfig = useCrawlerStore.getState().config
    const selectedIndustryIds = (currentConfig.selected_industry_ids ?? [])
      .filter((industryId) => availableIndustryIds.has(industryId))
    updateConfig({
      selected_industry_category_ids: selectedIndustryCategoryIds,
      selected_industry_ids: selectedIndustryIds,
      query_plans: defaultQueryPlans(
        currentConfig.enabled_source_types,
        currentConfig.selected_competitor_ids,
        currentConfig.include_experiment_queries,
        selectedIndustryIds,
      ),
    })
  }

  const selectedIndustryCategories = industryCategories.filter((category) =>
    selectedIndustryCategoryIds.includes(category.id),
  )
  const selectableIndustryIds = selectedIndustryCategories.flatMap((category) =>
    category.industries.map((industry) => industry.id),
  )

  const previewQueries = useMemo(
    () => buildSearchQueries(
      {
        platform: config.platform as 'xhs' | 'dy',
        enabledSourceTypes: config.enabled_source_types,
        selectedCompetitorIds: config.selected_competitor_ids,
        selectedIndustryIds,
        queryPlans: config.query_plans,
      },
      config.competitors,
    ),
    [
      config.competitors,
      config.enabled_source_types,
      config.query_plans,
      config.selected_competitor_ids,
      selectedIndustryIds,
    ],
  )

  const previewGroups = useMemo(() => {
    const indexedQueries = previewQueries.map((plan, index) => ({ plan, index }))
    const competitorGroups = config.competitors
      .filter((competitor) =>
        config.selected_competitor_ids.includes(competitor.id),
      )
      .map((competitor) => ({
        key: competitor.id,
        label: competitor.name,
        items: indexedQueries.filter(
          ({ plan }) =>
            plan.source_type === 'competitor_interception' &&
            plan.target_competitor === competitor.id,
        ),
      }))
    const manualCompetitorItems = indexedQueries.filter(
      ({ plan }) => plan.source_type === 'manual',
    )
    const generalItems = indexedQueries.filter(
      ({ plan }) => plan.source_type === 'general_selection',
    )
    const industryGroupLabels: Record<string, string> = {
      broad: '泛行业词',
      scenario: '业务场景词',
      constraint: '约束需求词',
    }
    const industryGroups = Object.entries(industryGroupLabels).map(([key, label]) => ({
      key: `industry-${key}`,
      label,
      items: indexedQueries.filter(
        ({ plan }) => plan.source_type === 'industry_demand' && plan.query_group === key,
      ),
    }))

    return [
      ...(config.enabled_source_types.includes('competitor_interception')
        ? competitorGroups
        : []),
      ...(manualCompetitorItems.length
        ? [{ key: 'manual', label: '手动添加', items: manualCompetitorItems }]
        : []),
      ...(config.enabled_source_types.includes('general_selection')
        ? [{ key: 'general-selection', label: '泛选型需求', items: generalItems }]
        : []),
      ...(config.enabled_source_types.includes('industry_demand')
        ? industryGroups
        : []),
    ]
  }, [
    config.competitors,
    config.enabled_source_types,
    config.selected_competitor_ids,
    selectedIndustryIds,
    previewQueries,
  ])

  const competitorQueryCount = previewQueries.filter(
    (plan) => plan.source_type === 'competitor_interception',
  ).length
  const generalQueryCount = previewQueries.filter(
    (plan) => plan.source_type === 'general_selection',
  ).length
  const industryQueryCount = previewQueries.filter(
    (plan) => plan.source_type === 'industry_demand',
  ).length

  const updateQuery = (index: number, patch: Record<string, unknown>) => {
    const nextQueries = previewQueries.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )
    updateConfig({
      query_plans: buildSearchQueries(
          {
            platform: config.platform as 'xhs' | 'dy',
            enabledSourceTypes: config.enabled_source_types,
            selectedCompetitorIds: config.selected_competitor_ids,
            selectedIndustryIds,
            queryPlans: nextQueries,
          },
          config.competitors,
      ),
    })
  }

  const addQuery = () => {
    const query = newQuery.trim()
    if (!query || previewQueries.some((item) => item.query === query)) return
    const targetCompetitor = (
      config.enabled_source_types.includes('competitor_interception') &&
      config.selected_competitor_ids.length > 0
    )
      ? config.selected_competitor_ids[0]
      : null
    updateConfig({
      query_plans: buildSearchQueries(
        {
          platform: config.platform as 'xhs' | 'dy',
          enabledSourceTypes: config.enabled_source_types,
          selectedCompetitorIds: config.selected_competitor_ids,
          selectedIndustryIds,
          queryPlans: [
            ...previewQueries,
            {
              query,
              query_text: query,
              max_notes: config.max_notes_per_query,
              source_type: 'manual',
              target_competitor: targetCompetitor,
              platform: config.platform as 'xhs' | 'dy',
              query_group: 'manual',
            },
          ],
        },
        config.competitors,
      ),
    })
    setNewQuery('')
  }

  return (
    <section className="rounded-lg glass-panel float-panel overflow-hidden">
      <header className="px-4 py-3 border-b border-cyber-border-subtle/50 flex items-center justify-between bg-cyber-bg-tertiary/30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-cyber-bg-tertiary border border-cyber-border-subtle flex items-center justify-center">
            <Radar className="h-4 w-4 text-cyber-neon-cyan" />
          </div>
          <div>
            <div className="text-xs font-mono font-semibold text-cyber-text-primary">
              V3 {config.platform === 'dy' ? '抖音' : '小红书'}评论采集器
            </div>
            <div className="text-[10px] text-cyber-text-muted">
              筛{config.platform === 'dy' ? '视频' : '帖子'}，不筛评论；采集结果交给外部 AI 或人工分析
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono text-cyber-neon-cyan">
          {defaults ? `${defaults.runtime_version.product_name} v${defaults.runtime_version.version}` : '版本加载中…'}
        </span>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">评论处理模式</Label>
            <Select
              value={config.comment_processing_mode}
              onValueChange={(value) => updateConfig({
                comment_processing_mode: value as typeof config.comment_processing_mode,
              })}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="original">原始评论模式</SelectItem>
                {config.platform === 'xhs' && (
                  <SelectItem value="keyword_v1">V1 关键词过滤</SelectItem>
                )}
                <SelectItem value="lead_radar_v2">V3 评论采集器</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">增量采集策略</Label>
            <Select
              value={config.collection_strategy}
              onValueChange={(value) => updateConfig({
                collection_strategy: value as typeof config.collection_strategy,
              })}
              disabled={disabled || config.comment_processing_mode !== 'lead_radar_v2'}
            >
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="safe_incremental">安全增量（推荐）</SelectItem>
                <SelectItem value="recheck">到期复检</SelectItem>
                <SelectItem value="force_full_refresh">强制完整刷新</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">帖子复检周期（天）</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={config.note_recheck_interval_days}
              onChange={(event) => updateConfig({ note_recheck_interval_days: Number(event.target.value) || 7 })}
              disabled={disabled || config.comment_processing_mode !== 'lead_radar_v2'}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {config.platform === 'dy' && config.comment_processing_mode === 'lead_radar_v2' && (
          <div className="space-y-3 rounded-md border border-cyber-border-subtle p-3">
            <div>
              <Label className="text-xs">抖音搜索与采集参数</Label>
              <p className="text-[10px] text-cyber-text-muted">
                综合排序与不限时间为默认值；一级评论和二级回复分别限额，并发固定为 1。
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">搜索排序</Label>
                <Select
                  value={String(config.dy_search_sort_type)}
                  onValueChange={(value) => updateConfig({
                    dy_search_sort_type: Number(value) as 0 | 1 | 2,
                  })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">综合排序</SelectItem>
                    <SelectItem value="1">最多点赞</SelectItem>
                    <SelectItem value="2">最新发布</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">发布时间</Label>
                <Select
                  value={String(config.dy_search_publish_time_type)}
                  onValueChange={(value) => updateConfig({
                    dy_search_publish_time_type: Number(value) as 0 | 1 | 7 | 180,
                  })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">不限</SelectItem>
                    <SelectItem value="1">一天内</SelectItem>
                    <SelectItem value="7">一周内</SelectItem>
                    <SelectItem value="180">半年内</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {([
                ['详情候选/词', 'dy_search_detail_candidate_max', 1, 30],
                ['正式视频/词', 'dy_comment_fetch_video_max_per_query', 1, 20],
                ['high 一级评论', 'dy_high_first_level_comment_limit', 1, 500],
                ['medium 一级评论', 'dy_medium_first_level_comment_limit', 1, 500],
                ['high 二级回复总量', 'dy_high_sub_comment_total_limit', 0, 1000],
                ['medium 二级回复总量', 'dy_medium_sub_comment_total_limit', 0, 1000],
                ['单个父评论回复', 'dy_sub_comment_limit_per_parent', 1, 200],
                ['未知评论数探索/词', 'dy_unknown_comment_exploration_max', 0, 10],
              ] as const).map(([label, key, min, max]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    value={config[key]}
                    onChange={(event) => updateConfig({
                      [key]: Math.max(min, Math.min(max, Number(event.target.value) || min)),
                    })}
                    disabled={disabled}
                    className="h-9 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {config.comment_processing_mode === 'original' && (
          <p className="rounded-md border border-cyber-border-subtle p-3 text-xs text-cyber-text-secondary">
            保持原始采集行为，不执行关键词过滤或线索评分。
          </p>
        )}

        {config.comment_processing_mode === 'keyword_v1' && (
          <div className="space-y-2">
            <Label className="text-xs">V1 评论关键词（英文逗号分隔）</Label>
            <Input
              value={config.keyword_filter_keywords.join(',')}
              onChange={(event) => updateConfig({
                keyword_filter_keywords: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
              })}
              disabled={disabled}
              className="h-9 text-xs"
            />
          </div>
        )}

        {config.comment_processing_mode === 'lead_radar_v2' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">搜索来源（至少选择一项）</Label>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    ['competitor_interception', '竞品截流'],
                    ['general_selection', '泛选型需求'],
                    ['industry_demand', '行业需求'],
                  ] as const).map(([value, label]) => (
                    <div key={value} className="rounded-md border border-cyber-border-subtle text-xs">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`lead-source-${value}`}
                            checked={config.enabled_source_types.includes(value)}
                            onCheckedChange={(checked) => toggleSourceType(value, checked === true)}
                            disabled={disabled}
                          />
                          <label htmlFor={`lead-source-${value}`} className="cursor-pointer">
                            {label}
                          </label>
                        </div>
                        {value === 'industry_demand' && (
                          <button
                            type="button"
                            aria-label={industryExpanded ? '收起行业分类' : '展开行业分类'}
                            onClick={() => setIndustryExpanded((value) => !value)}
                            disabled={disabled}
                            className="rounded p-1 text-cyber-text-secondary transition-colors hover:bg-cyber-bg-tertiary hover:text-cyber-neon-cyan disabled:opacity-50"
                          >
                            {industryExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      {value === 'industry_demand' && industryExpanded && (
                        <div className="space-y-3 border-t border-cyber-border-subtle px-3 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-cyber-text-muted">先选大类，再到右侧勾选本次要搜索的具体行业</span>
                            <div className="flex gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => applyIndustryCategorySelection(
                                  industryCategories.map((category) => category.id),
                                )}
                                disabled={disabled || !defaults}
                                className="text-cyber-neon-cyan disabled:opacity-50"
                              >
                                全选
                              </button>
                              <button
                                type="button"
                                onClick={() => applyIndustryCategorySelection([])}
                                disabled={disabled || !defaults}
                                className="text-cyber-neon-pink disabled:opacity-50"
                              >
                                清空
                              </button>
                            </div>
                          </div>
                          {!industryCategories.length && (
                            <p className="text-xs text-cyber-neon-orange">行业配置尚未加载，请重启服务器后刷新页面。</p>
                          )}
                          {industryCategories.map((category) => (
                            <div key={category.id} className="space-y-1.5 rounded border border-cyber-border-subtle/70 p-2.5">
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  id={`lead-industry-category-${category.id}`}
                                  checked={selectedIndustryCategoryIds.includes(category.id)}
                                  onCheckedChange={(checked) => applyIndustryCategorySelection(
                                    checked === true
                                      ? [...selectedIndustryCategoryIds, category.id]
                                      : selectedIndustryCategoryIds.filter((id) => id !== category.id),
                                  )}
                                  disabled={disabled || !config.enabled_source_types.includes('industry_demand')}
                                />
                                <label htmlFor={`lead-industry-category-${category.id}`} className="cursor-pointer">
                                  <span className="block text-xs text-cyber-text-primary">{category.name}</span>
                                  <span className="mt-0.5 block text-[10px] text-cyber-text-muted">
                                    {category.industries.map((industry) => industry.name).join('、')}
                                  </span>
                                </label>
                              </div>
                            </div>
                          ))}
                          {config.enabled_source_types.includes('industry_demand') && !selectedIndustryCategoryIds.length && (
                            <p className="text-xs text-cyber-neon-pink">请至少选择一个行业大类</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!config.enabled_source_types.length && (
                  <p className="text-xs text-cyber-neon-pink">至少需要勾选一个来源，否则不能启动任务。</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">本次搜索词预览（已自动去重）</Label>
                    <span className="text-[10px] text-cyber-text-muted">{previewQueries.length} 条</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-cyber-border-subtle px-3 py-2 text-[10px] text-cyber-text-secondary">
                    <span>竞品截流：{competitorQueryCount} 条</span>
                    <span>泛选型需求：{generalQueryCount} 条</span>
                    <span>行业需求：{industryQueryCount} 条</span>
                    <span className="text-cyber-neon-cyan">去重后合计：{previewQueries.length} 条</span>
                  </div>
                </div>
                {config.enabled_source_types.includes('industry_demand') && selectedIndustryCategories.length > 0 && (
                  <div className="space-y-3 rounded-md border border-cyber-border-subtle p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs">行业需求</Label>
                        <p className="mt-1 text-[10px] text-cyber-text-muted">选择具体行业后，才会生成对应搜索词</p>
                      </div>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => applyIndustrySelection(selectableIndustryIds)}
                          disabled={disabled || !defaults}
                          className="text-cyber-neon-cyan disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          全选
                        </button>
                        <button
                          type="button"
                          onClick={() => applyIndustrySelection([])}
                          disabled={disabled || !defaults}
                          className="text-cyber-neon-pink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          清空
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {selectedIndustryCategories.map((category) => (
                        <section key={category.id} className="rounded border border-cyber-border-subtle/70 p-2.5">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-cyber-neon-cyan">{category.name}</span>
                            <span className="text-[10px] text-cyber-text-muted">
                              {category.industries.filter((industry) => selectedIndustryIds.includes(industry.id)).length}/{category.industries.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {category.industries.map((industry) => (
                              <div key={industry.id} className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  id={`lead-industry-${industry.id}`}
                                  checked={selectedIndustryIds.includes(industry.id)}
                                  onCheckedChange={(checked) => applyIndustrySelection(
                                    checked === true
                                      ? [...selectedIndustryIds, industry.id]
                                      : selectedIndustryIds.filter((id) => id !== industry.id),
                                  )}
                                  disabled={disabled}
                                />
                                <label htmlFor={`lead-industry-${industry.id}`} className="cursor-pointer">
                                  {industry.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                    {!selectedIndustryIds.length && (
                      <p className="text-xs text-cyber-neon-pink">请至少选择一个具体行业</p>
                    )}
                  </div>
                )}
                {config.enabled_source_types.includes('competitor_interception') && (
                  <div className="space-y-2 rounded-md border border-cyber-border-subtle p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">竞品截流</Label>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => applyCompetitorSelection(
                            config.competitors.map((competitor) => competitor.id),
                          )}
                          disabled={disabled || !defaults}
                          className="text-cyber-neon-cyan disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          全选
                        </button>
                        <button
                          type="button"
                          onClick={() => applyCompetitorSelection([])}
                          disabled={disabled || !defaults}
                          className="text-cyber-neon-pink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          清空
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {config.competitors.map((competitor) => (
                        <div key={competitor.id} className="flex items-center gap-2 text-xs">
                          <Checkbox
                            id={`lead-competitor-${competitor.id}`}
                            checked={config.selected_competitor_ids.includes(competitor.id)}
                            onCheckedChange={(checked) =>
                              toggleCompetitor(competitor.id, checked === true)
                            }
                            disabled={disabled}
                          />
                          <label
                            htmlFor={`lead-competitor-${competitor.id}`}
                            className="cursor-pointer"
                          >
                            {competitor.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    {!config.selected_competitor_ids.length && (
                      <p className="text-xs text-cyber-neon-pink">请至少选择一个竞品</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newQuery}
                    onChange={(event) => setNewQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addQuery()
                      }
                    }}
                    placeholder="添加搜索词"
                    disabled={disabled || !defaults || !config.enabled_source_types.length}
                    className="h-8 text-xs"
                  />
                  <button
                    type="button"
                    onClick={addQuery}
                    disabled={disabled || !defaults || !config.enabled_source_types.length}
                    className="px-3 rounded-md border border-cyber-neon-cyan/40 text-cyber-neon-cyan disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[32rem] overflow-y-auto rounded-md border border-cyber-border-subtle">
                  {previewGroups.map((group) => (
                    <section key={group.key} className="border-b border-cyber-border-subtle last:border-b-0">
                      <div className="sticky top-0 z-10 flex items-center justify-between bg-cyber-bg-tertiary px-3 py-2 text-[11px] font-medium text-cyber-neon-cyan">
                        <span>{group.label}</span>
                        <span>{group.items.length} 条</span>
                      </div>
                      <div className="divide-y divide-cyber-border-subtle">
                        {group.items.map(({ plan, index }) => (
                          <div key={`${plan.query}-${index}`} className="flex items-center gap-2 p-2">
                            <Input
                              value={plan.query}
                              onChange={(event) => updateQuery(index, {
                                query: event.target.value,
                                query_text: event.target.value,
                              })}
                              disabled={disabled}
                              className="h-8 text-xs flex-1"
                            />
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={plan.max_notes}
                              onChange={(event) => updateQuery(index, { max_notes: Number(event.target.value) || 1 })}
                              disabled={disabled}
                              className="h-8 text-xs w-20"
                              title={`该搜索词最多抓取${config.platform === 'dy' ? '视频' : '笔记'}数`}
                            />
                            <button
                              type="button"
                              onClick={() => updateConfig({
                                query_plans: previewQueries.filter((_, itemIndex) => itemIndex !== index),
                              })}
                              disabled={disabled}
                              className="text-cyber-neon-pink"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                  {!previewQueries.length && (
                    <p className="p-4 text-center text-xs text-cyber-text-muted">
                      尚无搜索词。
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ['获取二级评论', config.enable_sub_comments, (checked: boolean) => updateConfig({ enable_sub_comments: checked })],
                ['启用实验搜索词', config.include_experiment_queries, toggleExperimentQueries],
                ['保存技术排除记录', config.save_rejected_comments, (checked: boolean) => updateConfig({ save_rejected_comments: checked })],
              ].map(([label, checked, onChange]) => (
                <label key={label as string} className="flex items-center gap-2 rounded-md border border-cyber-border-subtle p-3 text-xs">
                  <Checkbox
                    checked={checked as boolean}
                    onCheckedChange={(value) => (onChange as (checked: boolean) => void)(value === true)}
                    disabled={disabled}
                  />
                  {label as string}
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
