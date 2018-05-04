import { prompt } from 'gluegun'

module.exports = {
  name: 'generate',
  alias: ['g'],
  run: async (toolbox) => {
    const { parameters, crud } = toolbox

    const name = parameters.first
      // Add a operation (CRUD)
      // Add operation to API Path
      // Create Saga File if not exists
      // Create Redux File if not exists
      // Add operation to Saga
      // Add operation to Redux
      // Patch Redux to redux/index
      // Patch Saga to sagas/index

    const askOperation = {
      type: 'list',
      name: 'operation',
      message: 'What kind of operation you want to add?',
      choices: ['Fetch', 'Create', 'Delete', 'Update']
    }
    const resultOperation = await prompt.ask(askOperation)
    const resultRoute = await prompt.ask({ type: 'input', name: 'route', message: 'API Route (resources/:id)>' })

    if (resultRoute.route) {
      crud.addApiRoute(name, resultRoute.route, resultOperation.operation.toLowerCase())
      crud.addReduxOperation(name, resultOperation.operation.toLowerCase())
    } else {
      toolbox.print.error('Please enter route')
    }
  }
}
