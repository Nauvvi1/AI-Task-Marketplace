export type BriefInput = Record<string, string>;

export type OrderSummary = {
  serviceCode: string;
  serviceTitle: string;
  priceTon: number;
  etaSeconds: number;
  deliverables: string[];
  brief: BriefInput;
};

export type GenerationOutput = Record<string, unknown>;
