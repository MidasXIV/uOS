import { Args, Command, Flags } from '@oclif/core';
import * as dotenv from 'dotenv'
dotenv.config()

export default class Gemini extends Command {
  static args = {
    query: Args.string({
      description: 'The query to send to Gemini',
      required: true,
    }),
  };

  static description = 'Interact with Google Gemini AI';

  static examples = [
    `$ uos gemini "What's the weather like today?"`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
    system: Flags.string({
      char: 's',
      default: 'You are a helpful AI assistant.',
      description: 'System message to set the context for the conversation',
    }),
  };

  async run() {
    const { args, flags } = await this.parse(Gemini);

    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const { ChatPromptTemplate } = await import('@langchain/core/prompts');
      const { StringOutputParser } = await import('@langchain/core/output_parsers');

      // Initialize the Gemini model
      const model = new ChatGoogleGenerativeAI({
        maxOutputTokens: 2048,
        maxRetries: 2,
        model: 'gemini-1.5-flash',
        temperature: 0,
      });

      // Create a prompt template
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', flags.system],
        ['human', '{input}'],
      ]);

      // Create a chain
      const chain = prompt.pipe(model).pipe(new StringOutputParser());

      // Execute the chain
      const response = await chain.invoke({
        input: args.query,
      });

      this.log(response);
    } catch (error) {
      this.error(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }
}
