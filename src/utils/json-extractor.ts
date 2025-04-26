import {AIMessage} from '@langchain/core/messages'

/**
 * Extended type for AIMessage that includes the original raw content.
 */
type ExtendedAIMessage = AIMessage & {
  raw: string // Includes the original raw content.
}

/**
 * Extracts JSON content from a string embedded between ```json and ``` tags.
 *
 * This function processes the `content` property of an `AIMessage` object,
 * identifies JSON blocks enclosed in markdown-style code fences (```json ... ```),
 * and extracts the JSON content. The extracted JSON is returned as part of the
 * modified `AIMessage` object, along with the original raw content.
 *
 * @param output - The `AIMessage` object containing the raw content to process.
 * @returns A new `AIMessage` object with the extracted JSON content and raw content.
 * @throws An error if JSON parsing fails.
 */
const extractJson = (
    output: AIMessage,
  ): ExtendedAIMessage => {
    const raw = output.content as string
    // Define the regular expression pattern to match JSON blocks
    const pattern = /```json(.*?)```/gs

    // Find all non-overlapping matches of the pattern in the string
    const matches = raw.match(pattern)
    let content = ''

    // Process each match, attempting to parse it as JSON
    try {
      content =
        matches
          ?.map((match) => {
            // Remove the markdown code block syntax to isolate the JSON string
            const jsonStr = match.replaceAll(/```json|```/g, '').trim()
            return jsonStr
          })
          .join('') ?? ''
    } catch {
      throw new Error(`Failed to parse: ${output}`)
    }

    // console.log('Extracted JSON:', JSON.parse(content));
    const processedOutput = {
      ...output,
      content: content as string, // Adjusted type to include parsed JSON
      raw: raw as string, // Adjusted type to include raw
    }

    return processedOutput as ExtendedAIMessage
  }

export default extractJson
