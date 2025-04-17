interface ITask {
  cycles: number;
  deadline?: string;
  status: string;
  text: string;
}

interface IProject {
  description: string;
  status: string;
  tasks: ITask[];
  title: string;
}

export const formatProjectsForAnalysis = (projects: IProject[]): string => {
  const activeProjects = projects.filter(p => p.status === 'Progress');

  return activeProjects.map(project => {
    const tasks = project.tasks
      .filter(task => task.status === 'Progress')
      .map(task => {
        const timeSpent = task.cycles * 30; // Convert cycles to minutes
        const hours = Math.floor(timeSpent / 60);
        const minutes = timeSpent % 60;
        const timeString = hours > 0
          ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `and ${minutes} minutes` : ''}`
          : `${minutes} minutes`;

        const deadlineInfo = task.deadline
          ? `\n    - Deadline: ${new Date(task.deadline).toLocaleDateString()}`
          : '';

        return `  • ${task.text}
    - Time spent: ${timeString}${deadlineInfo}`;
      })
      .join('\n');

    const projectDescription = project.description
      ? `\n  Description: ${project.description}`
      : '';

    return `Project: ${project.title}${projectDescription}
${tasks}`;
  }).join('\n\n');
};

export const getProjectSummary = (projects: IProject[]): string => {
  const activeProjects = projects.filter(p => p.status === 'Progress');
  const totalTasks = activeProjects.reduce((sum, p) => sum + p.tasks.length, 0);
  const totalTime = activeProjects.reduce((sum, p) =>
    sum + p.tasks.reduce((taskSum, t) => taskSum + t.cycles, 0), 0
  ) * 30; // Convert to minutes

  const hours = Math.floor(totalTime / 60);
  const minutes = totalTime % 60;

  return `You have ${activeProjects.length} active projects with ${totalTasks} tasks in progress.
Total time invested: ${hours} hour${hours === 1 ? '' : 's'} ${minutes > 0 ? `and ${minutes} minutes` : ''}`;
};
