import {Command, ux} from '@oclif/core'
import datePrompt from 'date-prompt'
import inquirer from 'inquirer'

import {readProjectsFile, timeStamp, updateProjectsFile} from '../utils/file'
import LogCommand from './log'

const Status = {
  Complete: 'Complete',
  Progress: 'Progress',
} as const

type IStatus = (typeof Status)[keyof typeof Status]

interface ITask {
  cycles: number
  deadline?: string
  status: IStatus
  text: string
}

interface IProject {
  description: string
  status: IStatus
  tasks: ITask[]
  title: string
}

// Helper function to get project titles from projects
const getProjectTitles = (projects) => projects.map((project) => project.title)

const getProjectTasksTitle = (projects, selectedProjectTitle) =>
  projects
    .find((project) => project.title === selectedProjectTitle)
    ?.tasks?.map((project) => `${project.text}${project.cycles ?  ' (' + project.cycles + ')': ''}`) ?? []

const getProjectTasks = (projects, selectedProjectTitle) =>
  projects.find((project) => project.title === selectedProjectTitle)?.tasks ?? []

const addProjectTask = (projects, selectedProjectTitle, task) => {
  for (const project of projects) {
    if (project.title === selectedProjectTitle) {
      project.tasks.push(task)
    }
  }

  return projects
}

// Helper function for adding a new project
const addNewProject = async (projects) => {
  const responses = await inquirer.prompt([
    {
      message: 'Enter a title for the new project:',
      name: 'newProjectTitle',
      type: 'input',
      async validate(input) {
        const isProjectWithTitleExists = getProjectTitles(projects).includes(input)
        if (input === '' || isProjectWithTitleExists) {
          return 'Invalid title'
        }

        return true
      },
    },
    {
      message: 'Provide a brief description:',
      name: 'newProjectDescription',
      type: 'input',
    },
  ])
  console.log(`Great choice! Your new project "${responses.newProjectTitle}" has been added`)
  // validate title or description

  const project = {
    description: responses.newProjectDescription,
    status: Status.Progress,
    tasks: [],
    title: responses.newProjectTitle,
  }
  projects.push(project)

  LogCommand.run([`-m A new project '${project.title}' is created`, `-t project-task`]);
  return projects
}

const updateTaskDetails = async (projects, selectedProjectTitle, selectedTaskTitle: string): Promise<void> => {
  const regex = /\((\d+)\)/;
  const match = selectedTaskTitle.match(regex);
  let normalizedTaskTitle = selectedTaskTitle;
  let cycles = 0;
  if (match) {
    const cyclesString = match[0];
    const parsedTaskTitle = selectedTaskTitle.split(cyclesString);
    normalizedTaskTitle = parsedTaskTitle[0].trim();
    cycles = Number.parseFloat(cyclesString.replace("(","").replace(")","")); // The text between parentheses
  }

  const selectedTask = getProjectTasks(projects, selectedProjectTitle).find((task) => task.text === normalizedTaskTitle)

  if (!selectedTask) {
    console.log('Task not found.')
    return
  }

  const {updateDecision} = await inquirer.prompt([
    {
      choices: ['Update task status', 'Update cycles', 'Go back'],
      message: `Update details for "${normalizedTaskTitle}":`,
      name: 'updateDecision',
      type: 'list',
    },
  ])

  switch (updateDecision) {
    case 'Update task status': {
      const {newStatus} = await inquirer.prompt([
        {
          choices: ['Progress', 'Complete'],
          message: 'Select new status:',
          name: 'newStatus',
          type: 'list',
        },
      ])

      selectedTask.updatedStatus = newStatus
      console.log(`Task status updated to "${newStatus}".`)
      break
    }

    case 'Update cycles': {
      const {newCycles} = await inquirer.prompt([
        {
          message: 'How many cycles are to be added:',
          name: 'newCycles',
          type: 'number',
        },
      ])

      selectedTask.cycles = cycles + newCycles;
      console.log(`Cycles updated to "${selectedTask.cycles}".`)
      LogCommand.run([`-m ${newCycles} focus cycle added for '${selectedTaskTitle}' for ['${selectedProjectTitle}']`, `-t project-task`]);
      break
    }

    case 'Go back': {
      console.log('Going back...')
      break
    }

    default: {
      break
    }
  }
}

// Helper function for managing tasks within a project
const manageProjectTasks = async (projects, selectedProjectTitle) => {
  const projectTasks = getProjectTasksTitle(projects, selectedProjectTitle)
  const predefinedProjectTasks = ['Add tasks', 'Delete project', 'Go back to projects']
  const {selectProjectTaskDecision} = await inquirer.prompt([
    {
      choices: [...projectTasks, new inquirer.Separator(), ...predefinedProjectTasks],
      message: 'Tasks:',
      name: 'selectProjectTaskDecision',
      type: 'list',
    },
  ])

  switch (selectProjectTaskDecision) {
    case 'Add tasks': {
      const responses = await inquirer.prompt([
        {
          message: `Let's add some tasks to your project!:`,
          name: 'selectProjectTask',
          type: 'input',
        },
        {
          // choices: ["Yes" , "No"],
          default: false,
          // Ai needs to keep track of deadlines and prompt users to work on it
          message: 'should we try to finish is before any deadline ?',
          name: 'selectProjectTaskDeadline',
          type: 'confirm',
        },
      ])
      let deadline
      if (responses.selectProjectTaskDeadline) {
        try {
          deadline = await datePrompt('When should we try to complete it by ?')
        } catch {
          console.error('Error in setting deadline')
        }
      }

      const task: ITask = {
        cycles: 0,
        deadline: responses.selectProjectTaskDeadline ? deadline : undefined,
        status: Status.Progress,
        text: responses.selectProjectTask,
      }

      addProjectTask(projects, selectedProjectTitle, task);
      LogCommand.run([`-m A new task '${task.text}' is added to project '${selectedProjectTitle}'`, `-t project-task`]);
      break
    }

    case 'Delete project': {
      // Implement logic for deleting the selected project
      console.log('')
      const responses = await inquirer.prompt([
        {
          message: `Are you sure you want to delete this project?`,
          name: 'confrimDeleteProject',
          type: 'confirm',
        },
      ])
      console.log(responses.confrimDeleteProject)
      break
    }

    case 'Go back to projects': {
      // Implement logic to return to the main project selection
      console.log('Returning to projects...')
      break
    }

    // default updates the task
    // cycles / tasks
    default: {
      await updateTaskDetails(projects, selectedProjectTitle, selectProjectTaskDecision)
      break
    }
  }

  return projects
}

export default class ProjectCommand extends Command {
  static description = 'Projects journal'
  async run() {
    // fetch projects
    // show loader

    // New
    // Seprator
    // Rest of projects

    // Project selected
    // Add tasks
    // delete project
    // Seprator
    // displays all tasks ( with cycles invested )

    // Select task
    // delete task
    // Add cycles to task

    // if AI can recognise work being done and automatically add cycles to task

    ux.action.start('fetching projects', 'initializing', {stdout: true})

    const projects = await readProjectsFile()
    // stop the spinner
    ux.action.stop()

    const projectTitles = getProjectTitles(projects)

    const {selectProjectDecision} = await inquirer.prompt([
      {
        choices: ['Create a new project', new inquirer.Separator(), ...projectTitles],
        message: 'Project Journal:',
        name: 'selectProjectDecision',
        type: 'list',
      },
    ])

    const dirtyProjects = await (selectProjectDecision === 'Create a new project'
      ? addNewProject(projects)
      : manageProjectTasks(projects, selectProjectDecision))

    updateProjectsFile(dirtyProjects)

    const time = timeStamp()
    // const meta = `mood:${responses.mood}, context:${responses.context}, problem:${responses.problem}`
    // const line = `${time} | decision | ${meta} | ${responses.decision}`

    // writeLineToCurrentFile(line)
  }
}
