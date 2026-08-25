import type {
  CompetitorConfig,
  CrawlerConfig,
  LeadSourceType,
  QueryPlanConfig,
} from '../types/crawler.ts'

const SOURCE_ORDER: LeadSourceType[] = [
  'competitor_interception',
  'general_selection',
  'industry_demand',
]

export interface SearchModeState {
  platform?: 'xhs' | 'dy'
  enabledSourceTypes: readonly LeadSourceType[]
  selectedCompetitorIds: readonly string[]
  selectedIndustryIds?: readonly string[]
  queryPlans?: readonly QueryPlanConfig[]
  queryPlansBySourceType?: Partial<
    Record<LeadSourceType, readonly QueryPlanConfig[]>
  >
}

function normalizeMaxNotes(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(Math.trunc(value), 100))
}

/**
 * Build the canonical search-query list used by both the preview and the
 * crawler start request. When queryPlans is provided it represents the
 * user's current edited list; otherwise defaults are selected by mode.
 */
export function buildSearchQueries(
  state: SearchModeState,
  competitors: readonly CompetitorConfig[],
): QueryPlanConfig[] {
  const enabledSourceTypes = SOURCE_ORDER.filter((sourceType) =>
    state.enabledSourceTypes.includes(sourceType),
  )
  const enabledSourceSet = new Set(enabledSourceTypes)
  const manualEnabled = enabledSourceTypes.length > 0
  const availableCompetitorIds = new Set(
    competitors.map((competitor) => competitor.id),
  )
  const selectedCompetitorIds = new Set(
    state.selectedCompetitorIds.filter((competitorId) =>
      availableCompetitorIds.has(competitorId),
    ),
  )
  const selectedIndustryIds = new Set(state.selectedIndustryIds ?? [])
  const candidates = state.queryPlans
    ? [...state.queryPlans]
    : enabledSourceTypes.flatMap(
        (sourceType) => state.queryPlansBySourceType?.[sourceType] ?? [],
      )

  const queries: QueryPlanConfig[] = []
  const seen = new Set<string>()

  for (const plan of candidates) {
    const queryText = (plan.query_text || plan.query).trim()
    if (
      !queryText ||
      seen.has(queryText) ||
      (
        state.platform &&
        plan.platform &&
        plan.platform !== state.platform
      ) ||
      (
        plan.source_type !== 'manual' &&
        !enabledSourceSet.has(plan.source_type)
      ) ||
      (plan.source_type === 'manual' && !manualEnabled)
    ) {
      continue
    }
    if (
      plan.source_type === 'competitor_interception' &&
      (
        selectedCompetitorIds.size === 0 ||
        (
          plan.target_competitor &&
          !selectedCompetitorIds.has(plan.target_competitor)
        )
      )
    ) {
      continue
    }
    if (
      plan.source_type === 'manual' &&
      plan.target_competitor &&
      !selectedCompetitorIds.has(plan.target_competitor)
    ) {
      continue
    }
    if (
      plan.source_type === 'industry_demand' &&
      (
        selectedIndustryIds.size === 0 ||
        !plan.target_industry ||
        !selectedIndustryIds.has(plan.target_industry)
      )
    ) {
      continue
    }

    seen.add(queryText)
    queries.push({
      ...plan,
      query: queryText,
      query_text: queryText,
      max_notes: normalizeMaxNotes(plan.max_notes),
      platform: state.platform ?? plan.platform ?? 'xhs',
      query_group: plan.query_group ?? (
        plan.source_type === 'manual' ? 'manual' : 'core'
      ),
      target_competitor: ['general_selection', 'industry_demand'].includes(plan.source_type)
        ? null
        : plan.target_competitor,
      target_industry: plan.source_type === 'industry_demand'
        ? plan.target_industry ?? null
        : null,
      industry_category: plan.source_type === 'industry_demand'
        ? plan.industry_category ?? null
        : null,
    })
  }

  return queries
}

export function buildCrawlerStartConfig(config: CrawlerConfig): CrawlerConfig {
  if (
    !['xhs', 'dy'].includes(config.platform) ||
    config.comment_processing_mode !== 'lead_radar_v2'
  ) {
    return config
  }

  const competitorSourceEnabled = config.enabled_source_types.includes(
    'competitor_interception',
  )
  const selectedCompetitorSet = new Set(
    competitorSourceEnabled ? config.selected_competitor_ids : [],
  )
  const selectedCompetitorIds = config.competitors
    .filter((competitor) => selectedCompetitorSet.has(competitor.id))
    .map((competitor) => competitor.id)
  const selectedIndustryIds = config.enabled_source_types.includes('industry_demand')
    ? (config.selected_industry_ids ?? [])
    : []
  const selectedIndustryCategoryIds = config.enabled_source_types.includes('industry_demand')
    ? (config.selected_industry_category_ids ?? [])
    : []
  const enabledSourceTypes = [...config.enabled_source_types]
  const competitors = config.competitors.map((competitor) => ({
    ...competitor,
    enabled: selectedCompetitorIds.includes(competitor.id),
  }))

  return {
    ...config,
    enabled_source_types: enabledSourceTypes,
    selected_competitor_ids: selectedCompetitorIds,
    selected_industry_category_ids: selectedIndustryCategoryIds,
    selected_industry_ids: selectedIndustryIds,
    competitors,
    query_plans: buildSearchQueries(
      {
        enabledSourceTypes,
        selectedCompetitorIds,
        selectedIndustryIds,
        queryPlans: config.query_plans,
        platform: config.platform as 'xhs' | 'dy',
      },
      competitors,
    ),
  }
}
