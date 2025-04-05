import * as action from '@actions/core'
import { Version } from './testflight'

async function run(): Promise<void> {
  try {
    const appId: string = action.getInput('app-id')
    const platform: string = action.getInput('platform')
    const projectPath: string = action.getInput('project-path')
    const apiKeyId = action.getInput('api-key-id')
    const apiPrivateKey = action.getInput('api-private-key')
    const issuerId = action.getInput('issuer-id')
    const version = new Version(apiPrivateKey, issuerId, apiKeyId)
    const currentBuildId = await version.buildNumber(appId, platform, projectPath)
    action.setOutput('build-number', `${currentBuildId}`)
  } catch (error) {
    if (error instanceof Error) {
      action.setFailed(error.message)
    }
  }
}

run()
