import {Command} from '@oclif/core'
import inquirer from 'inquirer'

import {timeStamp, writeLineToCurrentFile} from '../utils/file'

export default class DecisionCommand extends Command {
  static description = 'Decision journal'
  async run() {
    const responses = await inquirer.prompt([
      {
        message: 'The decision you made:',
        name: 'decision',
        type: 'input',
      },
      {
        choices: [
          'Energized',
          'Focused',
          'Relaxed',
          'Confident',
          'Tired',
          'Accepting',
          'Accomodating',
          'Anxious',
          'Resigned',
          'Frustrated',
          'Angry',
          'Focused',
        ],
        message: 'Mental/Physical state:',
        name: 'mood',
        type: 'list',
      },
      {
        message: 'Situation/Context:',
        name: 'context',
        type: 'input',
      },
      {
        message: 'The problem statement or frame:',
        name: 'problem',
        type: 'input',
      },
    ])

    const time = timeStamp()
    const meta = `mood:${responses.mood}, context:${responses.context}, problem:${responses.problem}`
    const line = `${time} | decision | ${meta} | ${responses.decision}`

    writeLineToCurrentFile(line)
  }
}
