// import { prompt } from 'gluegun/prompt'
import { patching } from 'gluegun/patching'
import { strings } from 'gluegun/strings'
import { filesystem } from 'gluegun/filesystem'

module.exports = (toolbox) => {
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
    }
    return restOperation
  }

  function getOperatingName(operation: string) {
    let restOperation
    if (operation == 'fetch') {
      restOperation = 'fetching'
    } else if (operation == 'create') {
      restOperation = 'creating'
    } else if (operation == 'delete') {
      restOperation = 'deleting'
    } else if (operation == 'update') {
      restOperation = 'updating'
    }
    return restOperation
  }

  async function addApiRoute(name: string, route: string, operation: string): Promise<void> {
    const fileName = 'App/Services/Api.js'
    if (!filesystem.exists(fileName)) {
      toolbox.print.error(`${fileName} not found`)
      return
    }
    const { pascalCase } = strings
    const pascalCaseName = pascalCase(name)
    const restOperationName = getRestOperationName(operation)

    const operationExists = await toolbox.patching.exists(fileName, restOperationName + pascalCaseName)
    if (operationExists) {
      toolbox.print.info(`API found, skipping`)
    } else {
      await patching.patch(fileName, {
        insert: "\tconst " + restOperationName + pascalCaseName + " = (data) => api." + restOperationName + "(`" + route + "`, data)\n",
        before: 'return {\n'
      })
      await patching.patch(fileName, {
        insert: "\t\t" + restOperationName + pascalCaseName + ",\n",
        after: 'return {\n'
      })
      toolbox.print.success(`Successfuly Api route added to ${fileName}`)
      toolbox.print.warning(`Please don't forget to change route to real data from redex`)
    }
  }

  async function addReduxOperation(name: string, operation: string): Promise<void> {
    const { template: { generate } } = toolbox
    const path = 'App/Redux'
    const fileName = `App/Redux/${name}Redux.js`
    const operatingName = getOperatingName(operation)

    if (!filesystem.exists(fileName)) {
      await generate({
        template: `redux-${operation}.ts.ejs`,
        target: fileName,
        props: { name }
      })
      toolbox.print.info(`Created ${path}/${name}Redux.js`)
    } else {
      toolbox.print.info(`Patching ${fileName}`)
      const { snakeCase, camelCase, pascalCase } = strings
      const operationExists = await toolbox.patching.exists(fileName, snakeCase(name).toUpperCase() + "_" + operation.toUpperCase() + "_REQUEST")
      if (operationExists) {
        toolbox.print.info(`Redux operation found, skipping`)
      } else {
        await patching.patch(fileName, {
          insert: `\t${camelCase(name)}${pascalCase(operation)}Request: ['data'],
  ${camelCase(name)}${pascalCase(operation)}Success: ['payload'],
  ${camelCase(name)}${pascalCase(operation)}Failure: null,\n`,
          after: 'createActions({\n'
        })

        await patching.patch(fileName, {
          insert: `\t[Types.${snakeCase(name).toUpperCase()}_${operation.toUpperCase()}_REQUEST]: request${pascalCase(operation)},
  [Types.${snakeCase(name).toUpperCase()}_${operation.toUpperCase()}_SUCCESS]: success${pascalCase(operation)},
  [Types.${snakeCase(name).toUpperCase()}_${operation.toUpperCase()}_FAILURE]: failure${pascalCase(operation)},\n`,
          after: 'createReducer(INITIAL_STATE, {\n'
        })

        await patching.patch(fileName, {
          insert: `\n\n/*\n* ${operation}\n*/\nexport const request${pascalCase(operation)} = (state, { data }) =>
  state.merge({ ${operatingName}: true, data, payload: null })

export const success${pascalCase(operation)} = (state, action) => {
  const { payload } = action
  return state.merge({ ${operatingName}: false, error: null, payload })
}

export const failure${pascalCase(operation)} = state =>
  state.merge({ ${operatingName}: false, error: true, payload: null })`,
          after: '/* ------------- Reducers ------------- */'
        })
        toolbox.print.success(`Redux operation added`)
      }

    }
  }
  toolbox.crud = { addApiRoute, addReduxOperation }
}
