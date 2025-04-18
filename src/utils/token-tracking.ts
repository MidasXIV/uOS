import dateFormat from 'dateformat';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IAgentTokenUsage, ITokenUsage } from '../types/token-tracking';

const homedir = os.homedir();
const TOKEN_USAGE_FILE = path.join(homedir, 'uOS_logs', 'token-usage.json');

export class TokenTracker {
  private static instance: TokenTracker;
  private tokenUsage: ITokenUsage = {};

  private constructor() {
    this.loadTokenUsage();
  }

  public static getInstance(): TokenTracker {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }

    return TokenTracker.instance;
  }

  public getAllTokenUsage(): ITokenUsage {
    return this.tokenUsage;
  }

  public getTokenUsage(agentName: string, model: string): IAgentTokenUsage | undefined {
    const agentKey = this.getAgentKey(agentName, model);
    return this.tokenUsage[agentKey];
  }

  public incrementTokenUsage(agentName: string, model: string, tokens: number): void {
    const agentKey = this.getAgentKey(agentName, model);
    const currentDate = this.getCurrentDate();

    if (!this.tokenUsage[agentKey]) {
      this.tokenUsage[agentKey] = {
        days: {},
        total: 0
      };
    }

    const agentUsage = this.tokenUsage[agentKey];
    agentUsage.total += tokens;

    if (!agentUsage.days[currentDate]) {
      agentUsage.days[currentDate] = 0;
    }

    agentUsage.days[currentDate] += tokens;

    this.saveTokenUsage();
  }

  private getAgentKey(agentName: string, model: string): string {
    return `${agentName}-${model}`;
  }

  private getCurrentDate(): string {
    return dateFormat(new Date(), 'dd-mm-yyyy');
  }

  private loadTokenUsage(): void {
    try {
      if (fs.existsSync(TOKEN_USAGE_FILE)) {
        const data = fs.readFileSync(TOKEN_USAGE_FILE, 'utf8');
        this.tokenUsage = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading token usage:', error);
      this.tokenUsage = {};
    }
  }

  private saveTokenUsage(): void {
    try {
      const dir = path.dirname(TOKEN_USAGE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(TOKEN_USAGE_FILE, JSON.stringify(this.tokenUsage, null, 2));
    } catch (error) {
      console.error('Error saving token usage:', error);
    }
  }
}
