import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import * as dotenv from 'dotenv';

import FRIDAY_CHAT_PROMPT from '../../utils/friday-chat-prompt';
import { TokenTracker } from '../../utils/token-tracking';

dotenv.config();

export class ChatAgent {
  private chatHistory: (AIMessage | HumanMessage | SystemMessage)[] = [];
  private model: ChatGoogleGenerativeAI;
  private systemPrompt: string = `You are Youno, a friendly and helpful AI assistant. You have a warm, approachable personality and always aim to be concise yet thorough in your responses. You use emojis occasionally to express emotions and maintain a casual but professional tone. You're knowledgeable, patient, and always ready to help with a positive attitude.`;
  private tokenTracker: TokenTracker;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      maxOutputTokens: 2048,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      temperature: 1,
    });
    this.tokenTracker = TokenTracker.getInstance();
    this.clearHistory(); // Initialize with system message
  }

  clearHistory(): void {
    this.chatHistory = [new SystemMessage(this.systemPrompt)];
  }

  async initialize(systemPrompt: string): Promise<void> {
    this.systemPrompt = systemPrompt;
    // TODO: do not override user prompt in future
    this.systemPrompt = FRIDAY_CHAT_PROMPT;
    this.clearHistory();
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // Add user message to history
      this.chatHistory.push(new HumanMessage(message));

      // Create messages array with system message first
      const messages = [
        new SystemMessage(this.systemPrompt),
        ...this.chatHistory.slice(1, -1), // Include all messages except the current one
        new HumanMessage(message),
      ];

      // Get the response
      const response = await this.model.invoke(messages);

      // Add AI response to history
      this.chatHistory.push(response);

      // Track token usage using actual counts from metadata
      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const totalTokens = response.usage_metadata?.total_tokens || 0;
      this.tokenTracker.incrementTokenUsage('chat', modelName, totalTokens);

      return response.content.toString();
    } catch (error) {
      throw new Error(`Failed to get response: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }
}
