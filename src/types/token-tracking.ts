export interface IDailyTokenUsage {
  [date: string]: number;
}

export interface IAgentTokenUsage {
  days: IDailyTokenUsage;
  total: number;
}

export interface ITokenUsage {
  [agentKey: string]: IAgentTokenUsage;
}
