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
    } else {
      restOperation = 'get'
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
    } else {
      restOperation = 'fetching'
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
        insert: "const " + operation + pascalCaseName + " = (data) => api." + operation + "(`" + route + "`, data)\n",
        before: 'return {\n'
      })
      await patching.patch(fileName, {
        insert: "    " + operation + pascalCaseName + ",\n",
        after: 'return {\n'
      })
      toolbox.print.success(`Successfuly Api route added to ${fileName}`)
      toolbox.print.warning(`Please don't forget to change route to real data from redex`)
    }
  }

  async function addReduxOperation(name: string, operation: string): Promise<void> {
    const { template: { generate } } = toolbox
    const path = 'App/Redux'
    const fileName = `${path}/${name}Redux.js`
    const operatingName = getOperatingName(operation)

    if (!filesystem.exists(fileName)) {
      await generate({
        template: `redux.ts.ejs`,
        target: fileName,
        props: { name, operation, operatingName }
      })
      toolbox.print.info(`Created ${path}/${fileName}`)
    } else {
      toolbox.print.info(`Patching ${fileName}`)
      const { snakeCase, camelCase, pascalCase } = strings
      const operationExists = await toolbox.patching.exists(fileName, snakeCase(name).toUpperCase() + "_" + snakeCase(operation).toUpperCase() + "_REQUEST")
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
          insert: `\t[Types.${snakeCase(name).toUpperCase()}_${snakeCase(operation).toUpperCase()}_REQUEST]: request${pascalCase(operation)},
  [Types.${snakeCase(name).toUpperCase()}_${snakeCase(operation).toUpperCase()}_SUCCESS]: success${pascalCase(operation)},
  [Types.${snakeCase(name).toUpperCase()}_${snakeCase(operation).toUpperCase()}_FAILURE]: failure${pascalCase(operation)},\n`,
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

  async function addSagaOperation(name: string, operation: string): Promise<void> {
    const { template: { generate } } = toolbox
    const path = 'App/Sagas'
    const fileName = `${path}/${name}Sagas.js`
    const restName = getRestOperationName(operation)

    if (!filesystem.exists(fileName)) {
      await generate({
        template: `sagas.ts.ejs`,
        target: fileName,
        props: { name, operation, restName }
      })
      toolbox.print.info(`Created ${path}/${fileName}`)
    } else {
      toolbox.print.info(`Patching ${fileName}`)
      const { pascalCase, camelCase } = strings
      const operationExists = await toolbox.patching.exists(fileName, "export function * "+operation+pascalCase(name))
      if (operationExists) {
        toolbox.print.info(`Saga operation found, skipping`)
      } else {
        await patching.append(fileName, `\nexport function * ${operation}${pascalCase(name)} (api, action) {
  const { data } = action
  // const currentData = yield select(${pascalCase(name)}Selectors.getData)
  // make the call to the api
  const response = yield call(api.${operation}${pascalCase(name)}, data)

  // success?
  if (response.ok && isNil(response.data.error)) {
    yield put(${pascalCase(name)}Actions.${camelCase(operation)}Success(response.data))
  } else {
    yield put(${pascalCase(name)}Actions.${camelCase(operation)}Failure())
  }
}\n`)
        toolbox.print.success(`Saga operation added`)
      }
    }
  }

  async function addSagaIndex(name: string, operation: string): Promise<void> {
    const path = 'App/Sagas'
    const fileName = `${path}/index.js`
    if (!filesystem.exists(fileName)) {
      toolbox.print.error(`${path}/${fileName} not found`)
    } else {
      const { pascalCase, snakeCase } = strings
      const typeExists = await toolbox.patching.exists(fileName, "from '../Redux/" + pascalCase(name) +"Redux'")
      if (typeExists) {
        toolbox.print.info(`Saga Index: ${pascalCase(name)} type exists, skipping`)
      } else {
        await patching.patch(fileName, {
          insert: `\nimport { ${pascalCase(name)}Types } from '../Redux/${pascalCase(name)}Redux'`,
          after: '/* ------------- Types ------------- */'
        })
        toolbox.print.success(`Saga Index:  Saga type added`)
      }

      const sagaExists = await toolbox.patching.exists(fileName, `from './${pascalCase(name)}Sagas'`)
      if (sagaExists) {
        toolbox.print.info(`Saga Index: ${ pascalCase(name) } saga exists, skipping`)
        const operationExists = await toolbox.patching.exists(fileName, `${operation}${pascalCase(name)}`)
        if (operationExists) {
          toolbox.print.info(`Saga Index: ${pascalCase(name)} operation exists, skipping`)
        } else {
          await patching.patch(fileName, {
            insert: `, ${operation}${pascalCase(name)}`,
            before: ` } from './${pascalCase(name)}Sagas'`
          })
          toolbox.print.success(`Saga Index:  Saga operation import added`)
        }
      } else {
        await patching.patch(fileName, {
          insert: `\nimport { ${operation}${pascalCase(name)} } from './${pascalCase(name)}Sagas'`,
          after: `/* ------------- Sagas ------------- */`
        })
        toolbox.print.success(`Saga Index:  Saga operation import added`)
      }

      const typeConnectExists = await toolbox.patching.exists(fileName, `takeLatest(${pascalCase(name)}Types.${snakeCase(name).toUpperCase()}_${snakeCase(operation).toUpperCase()}_REQUEST, ${operation}${pascalCase(name)}, api)`)
      if (typeConnectExists) {
        toolbox.print.info(`Saga Index: ${pascalCase(name)} type connect exists, skipping`)
      } else {
        await patching.patch(fileName, {
          insert: `\n    takeLatest(${ pascalCase(name)}Types.${ snakeCase(name).toUpperCase() }_${ snakeCase(operation).toUpperCase() }_REQUEST, ${ operation }${ pascalCase(name) }, api),`,
          after: `yield all([`
        })
        toolbox.print.success(`Saga Index: Saga operation connected to redux`)
      }

    }
  }

  async function addReduxIndex(name: string, operation: string): Promise<void> {
    const path = 'App/Redux'
    const fileName = `${path}/index.js`
    if (!filesystem.exists(fileName)) {
      toolbox.print.error(`${path}/${fileName} not found`)
    } else {
      const { pascalCase, camelCase } = strings
      const reduxExists = await toolbox.patching.exists(fileName, "require('./" + pascalCase(name)+"Redux').reducer")
      if (reduxExists) {
        toolbox.print.info(`Redux Index: ${pascalCase(name)} exists, skipping`)
      } else {
        await patching.patch(fileName, {
          insert: `\n  ${camelCase(name)}: require('./${pascalCase(name)}Redux').reducer,`,
          after: "export const reducers = combineReducers({"
        })
        toolbox.print.success(`Redux Index: Redux added`)
      }
    }
  }

  toolbox.crud = { addApiRoute, addReduxOperation, addSagaOperation, addSagaIndex, addReduxIndex }
}
