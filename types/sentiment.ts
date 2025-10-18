export type SentimentComponent = {
  name: string;
  ok: boolean;
  normalized: number;
  weight_applied: number;
  details?: Record<string, unknown>;
  message?: string;
};

export type SentimentResponse = {
  as_of: string;
  composite: number;
  model_version: string;
  ttl_seconds: number;
  components: SentimentComponent[];
  notes?: string[];
};
