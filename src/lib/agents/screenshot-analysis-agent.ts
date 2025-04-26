import {ChatPromptTemplate} from '@langchain/core/prompts'
import {ChatGoogleGenerativeAI} from '@langchain/google-genai'
import {AzureChatOpenAI} from '@langchain/openai'
import * as dotenv from 'dotenv'

dotenv.config()

import {RunnableLambda} from '@langchain/core/runnables'

import {IAnalysisResult} from '../../types/analysis'
import {IProject} from '../../types/project'
import {readProjectsFile} from '../../utils/file'
import extractJson from '../../utils/json-extractor'
import {formatProjectsForAnalysis, getProjectSummary} from '../../utils/project-parsing'
import {TokenTracker} from '../../utils/token-tracking'

export class ScreenshotAnalysisAgent {
  private model: ChatGoogleGenerativeAI
  private projects: IProject[] = []

  private tokenTracker: TokenTracker

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      maxRetries: 2,
      model: process.env.GEMINI_SCREENSHOT_ANALYSIS_MODEL || 'gemini-1.5-flash',
      temperature: 0.2,
    })

    // this.model = new AzureChatOpenAI({
    //   azureOpenAIApiDeploymentName: process.env.deployment_name,
    //   azureOpenAIApiKey: process.env.api_key,
    //   azureOpenAIApiVersion: process.env.api_version,
    //   azureOpenAIEndpoint: process.env.api_base,
    //   maxRetries: 2,
    //   maxTokens: undefined,
    //   model: process.env.model_name,
    //   temperature: 0,
    // });

    this.tokenTracker = TokenTracker.getInstance()
  }

  public async analyzeScreenshot(query: string, imageBase64: string): Promise<IAnalysisResult> {
    try {
      await this.initializeProjects()

      const systemPrompt = this.createSystemPrompt()

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        [
          'human',
          [
            {text: '{text}', type: 'text'},
            {image_url: {url: '{image}'}, type: 'image'},
          ],
        ],
      ])

      const chain = prompt.pipe(this.model).pipe(new RunnableLambda({func: extractJson}))
      // const chain = prompt.pipe(this.model)

      const input = {
        image: `data:image/png;base64,${imageBase64}`,
        text: query,
      }

      const response = await chain.invoke(input)

      const modelName = process.env.GEMINI_SCREENSHOT_ANALYSIS_MODEL || 'gemini-1.5-flash'
      const totalTokens = response.usage_metadata?.total_tokens || 0
      const promptTokens = response.usage_metadata?.input_tokens || 0
      this.tokenTracker.incrementTokenUsage('screenshot', modelName, totalTokens)

      console.log('Response:', JSON.parse(response.content as string))
      console.log(`Prompt tokens: ${promptTokens} | Total tokens: ${totalTokens}`)

      const analysisResult = JSON.parse(response.content as string) as unknown as IAnalysisResult

      return analysisResult
    } catch (error) {
      console.error('Error analyzing screenshot:', error)
      return {
        status: 'Error',
        summary: 'Error analyzing screenshot',
      } as IAnalysisResult
    }
  }

  private createSystemPrompt(): string {
    const projectSummary = getProjectSummary(this.projects)
    const formattedProjects = formatProjectsForAnalysis(this.projects)

    //     return `
    // You are a Screenshot Analysis Assistant.
    // Your job is to describe a screenshot of my screen in meticulous, factual detail. You must describe only what is visible — do not guess or hallucinate what might be happening.

    // Your analysis must follow these rules:
    // 1. Be extremely specific. Label UI elements, tools, websites, filenames, tabs, icons, videos, etc.
    // 2. If you can identify a game, video, chat app, IDE, blog, email client, etc., name it.
    // 3. If there is code visible, include actual variable names, function names, or filenames as shown.
    // 4. If you cannot read a section or recognize something, say so explicitly and label it as "Unclear" or "Unreadable".
    // 5. If the screenshot shows something that resembles work but doesn’t match any known tools or apps, describe it neutrally and tag it as “Unknown Work Tool”.

    // Never infer intent or status. Describe what you see and where it is on the screen.

    // Format your output using the following JSON structure (return as plain text, not inside a code block):
    // {{
    //   "visibleApps": ["List of apps/tools/websites identified"],
    //   "mainContentArea": "Detailed description of what is in the primary area of the screen (center/middle)",
    //   "sidePanels": {{
    //     "left": "What's visible in the left sidebar (e.g. file tree, terminal)",
    //     "right": "What's in the right sidebar if anything",
    //     "topBar": "Any open tabs, file names, window titles, etc.",
    //     "bottomBar": "Visible status bars, terminal, dock or taskbar items",
    //     "mediaContent": {{
    //       "isVideoVisible": true,
    //       "videoTitle": "If known",
    //       "platform": "e.g. YouTube, Netflix, VLC",
    //       "isGameVisible": false,
    //       "gameTitle": "If known"
    //     }},
    //     "codeDetails": {{
    //       "language": "Try to identify the programming language if any",
    //       "identifiers": [ "List of function or variable names you can clearly see"],
    //       "filenames": ["List of filenames or paths visible"]
    //     }},
    //     "textVisible": ["Short list of clearly visible headings, text snippets, or chat messages"],
    //     "uncertainAreas": ["List any parts of the screen you cannot interpret or read"],
    //     "notableIcons": ["Icons from dock, taskbar, browser extensions, etc."],
    //     "distractionsDetected": ["e.g. Twitter, YouTube, game, chat app"],
    //     "comments": "Any other relevant factual details not covered above. Avoid speculation."
    //   }}
    //     `

    return `
You are a task monitoring assistant with the mindset of a smart, inquisitive secretary.
I will send you a screenshot of my screen. Your role is to carefully observe everything happening and classify my activities.

Active context: ${projectSummary}

List of my current active projects and tasks: ${formattedProjects}

You must be highly attentive:
- Notice if I'm working on one or multiple active tasks.
- Notice if I'm simultaneously distracted (e.g., video playing, chatting, browsing unrelated sites).
- If something new is visible that you don't recognize, flag it under "Unresolved" with a thoughtful guess.
- Always assume there could be multiple simultaneous activities.

Respond with valid JSON in the following structure:
{{
  "status": "On Task | Off Task | Mixed Activity | Unclear | Unresolved",
  "summary": "Short paragraph describing everything notable happening on the screen.",
  "analysis": {{
    "onTask": [
      {{
        "project": "Name of project if identified",
        "task": "Specific task if identified",
        "confidence": "0-100",
        "estimatedTimeSpent": "e.g. '15 minutes' or 'likely continuous'",
        "evidence": "Details from the screenshot supporting this"
      }}
    ],
    "offTask": [
      {{
        "activity": "Identify distractions (e.g. video, chat, social media, etc.)",
        "details": "Names, titles, subjects if visible",
        "suggestion": "Friendly nudge to refocus"
      }}
    ],
    "unresolved": [
      {{
        "observation": "Anything unusual, new, or unclear, something not in the projects or goals",
        "potentialProject": "Guess the domain if applicable (e.g., new repo, unfamiliar code editor, new movie, video or tutorial)",
        "possibleIssue": "Flag if manual review is needed (e.g., error messages, performance issues)"
      }}
    ]
  }},
  "generalObservations": {{
    "elements": ["List every visible app/window/tool"],
    "habits": "Patterns like multitasking, distraction, deep work, etc.",
    "potentialDistractions": ["List possible distractions"],
    "suggestions": ["Simple advice to improve focus, flow, and productivity"],
    "flags": ["Any critical unresolved or suspicious observations"]
  }}
}}

Guidelines:
1. 'onTask', 'offTask', and 'unresolved' are arrays because multiple activities may happen simultaneously.
2. 'summary' must concisely describe all major activities, covering both work and distractions.
3. Be inquisitive: if something is unfamiliar, make a reasonable guess.
4. Always be structured, factual, and detailed. Never hallucinate.
5. If the screenshot is unreadable, use 'Unclear' and explain why.
6. Maintain a friendly, supportive, and concise tone — like a helpful assistant.
`
  }

  private async initializeProjects(): Promise<void> {
    this.projects = await readProjectsFile()
  }
}
