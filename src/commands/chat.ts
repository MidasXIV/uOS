import { Command, Config, Flags, ux } from '@oclif/core';
import * as dotenv from 'dotenv';

import { ChatAgent } from '../lib/agents/chat-agent';
import { DEFAULT_SYS_PROMPT, FRIDAY_SYS_PROMPT, THERAPY_AGENT_PROMPT } from '../utils/chat-system-prompt';
import { timeStamp, writeLineToCurrentFile } from '../utils/file';
import { TokenTracker } from '../utils/token-tracking';

dotenv.config();

export default class Chat extends Command {
  static description = 'Start an interactive chat session with the AI agent';

  static examples = [
    `$ uos chat`,
    `$ uos chat --system "You are a helpful coding assistant."`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
    system: Flags.string({
      char: 's',
      default: 'You are a helpful AI assistant.',
      description: 'System prompt to set the behavior of the AI',
    }),
    therapy: Flags.boolean({
      char: 't',
      default: false,
      description: 'Set the AI to behave like a therapist',
    })
  };

  private agent: ChatAgent;
  private isChatting: boolean = false;
  private tokenTracker: TokenTracker;

  constructor(argv: string[], config: Config) {
    super(argv, config);
    this.agent = new ChatAgent();
    this.tokenTracker = TokenTracker.getInstance();
  }

  async run() {
    const { flags } = await this.parse(Chat);

    try {
      // Determine the system prompt based on flags
      let systemPrompt: string = DEFAULT_SYS_PROMPT;

      switch (true) {
        case flags.therapy: {
          systemPrompt = THERAPY_AGENT_PROMPT;
          break;
        }

        default: {
          systemPrompt = flags.system || FRIDAY_SYS_PROMPT;
          break;
        }
      }

      // Initialize the agent with the system prompt
      await this.agent.initialize(systemPrompt);

      this.log('\n🤖 Chat session started. Type "exit" or "quit" to end the session.\n');
      this.isChatting = true;

      // Main chat loop
      while (this.isChatting) {
        const userInput = await this.prompt('You: ');

        if (['exit', 'quit'].includes(userInput.toLowerCase())) {
          this.isChatting = false;
          this.log('\n👋 Chat session ended. Goodbye!\n');

          // Display token usage summary
          const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
          const usage = this.tokenTracker.getTokenUsage('chat', modelName);
          if (usage) {
            this.log('\nToken Usage Summary:');
            this.log(`Today's Usage: ${usage.days[this.getCurrentDate()] || 0} tokens`);
            this.log(`Total Usage: ${usage.total} tokens`);
            this.log(`Average Daily Usage: ${Math.round(usage.total / Object.keys(usage.days).length)} tokens\n`);
          }

          break;
        }

        if (userInput.trim()) {
          try {
            const response = await this.agent.sendMessage(userInput);
            this.log(`\nAI: ${response}\n`);

            // Log the interaction with timestamp
            const time = timeStamp()
            await writeLineToCurrentFile(
              `${time} | Chat | User: ${userInput} | AI: ${response}`,
              'chat'
            );
          } catch (error) {
            this.error(`Error getting response: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
          }
        }
      }

    } catch (error) {
      this.error(`Error initializing chat: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0].replaceAll('-', '');
  }

  private async prompt(question: string): Promise<string> {
    return ux.prompt(question);
  }
}

