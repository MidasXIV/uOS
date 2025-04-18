export interface ITask {
  cycles: number
  deadline?: string
  status: string
  text: string
}

export interface IProject {
  description: string
  status: string
  tasks: ITask[]
  title: string
}

export const Status = {
  Complete: 'Complete',
  Progress: 'Progress',
} as const

export type IStatus = (typeof Status)[keyof typeof Status]
