import { prompt } from 'gluegun'
import { strings } from 'gluegun/strings'

function getRestOperationName(operation: string) {
    let restOperation
    if (operation == 'fetch') {
      restOperation = 'get'
    } else if (operation == 'create') {
      restOperation = 'post'
    } else if (operation == 'delete') {
      restOperation = 'delete'
    } else if (operation == 'update') {
      restOperation = 'put'
    } else {
      restOperation = 'get'
    }
    return restOperation
  }

module.exports = {
  name: 'crud',

  run: async (toolbox) => {
    const { parameters, crud } = toolbox

    const name = parameters.first
    if (name === undefined) {
      toolbox.print.error('Please enter model name like User or Product like; rn-scaffold crud Product')
      return
    }
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
      choices: ['Fetch', 'Create', 'Delete', 'Update', 'Other']
    }
    const { kebabCase } = strings
    const resultOperation = await prompt.ask(askOperation)
    const resultRoute = await prompt.ask({ type: 'input', name: 'route', message: 'API Route ('+kebabCase(name).toLowerCase()+'/:id)>' })
    let operationName = ''
    let operationMethod = ''

    if (resultOperation.operation == 'Other') {
      const resultCustomOperation = await prompt.ask({ type: 'input', name: 'customOperation', message: 'Custom operation name (use_coupon)'})
      if (resultCustomOperation.customOperation) {
        operationName = resultCustomOperation.customOperation

        const askMethod = {
          type: 'list',
          name: 'method',
          message: 'Which method will it use?',
          choices: ['get', 'post', 'put', 'delete']
        }
        const resultMethod = await prompt.ask(askMethod)
        operationMethod = resultMethod.method
      } else {
        toolbox.print.error('Please enter operation name')
      }
    } else {
      operationName = resultOperation.operation
      operationMethod = getRestOperationName(operationName)
    }

    

    if (resultRoute.route) {
      crud.addApiRoute(name, resultRoute.route, operationName.toLowerCase(), operationMethod)
      crud.addReduxOperation(name, operationName.toLowerCase())
      crud.addSagaOperation(name, operationName.toLowerCase(), operationMethod)
      crud.addSagaIndex(name, operationName.toLowerCase())
      crud.addReduxIndex(name, operationName.toLowerCase())
    } else {
      toolbox.print.error('Please enter route')
    }
  }
}
