// Import the API version from the package, which mirror Apple's API versioning
import { v1 } from 'appstoreconnect'
import fs from 'fs'

// Initialize the service. Passing the token up-front is optional, but should be done before any API calls are made.

// Compare to https://developer.apple.com/documentation/appstoreconnectapi/list_builds

export class Version {
  private api: ReturnType<typeof v1> | null = null;

  public constructor(
    privateKey: string,
    issuerId: string,
    keyId: string,
  ) {
    const token = v1.token(privateKey, issuerId, keyId)
    this.api = v1(token)
  }

  getLatestAppVersionId = async (appId: string, platform: string) => {
    if (!this.api) {
      throw new Error('API not initialized');
    }
    return new Promise<string>((resolve, reject) => {
      v1.testflight
        .listPrereleaseVersions(this.api!, {
          filter: {
            app: [appId],
            platform: [platform],
          } as any,
          sort: ['-version'], // Sort by version descending
        })
        .then(prereleaseVersions => {
          if (prereleaseVersions.data.length > 0) {
            const latestVersion = prereleaseVersions.data[0];
            resolve(latestVersion.id);
          } else {
            reject('No prerelease versions found.');
          }
        })
        .catch(err => {
          console.error('Error fetching prerelease versions:', err);
          reject(err);
        });
    });
  }


  getLatestBuildId = async (prereleaseVersionId: string) => {
    if (!this.api) {
      throw new Error('API not initialized');
    }
    return new Promise<string>((resolve, reject) => {
      v1
        .testflight
        .listBuilds(this.api!, {
          fields: {
            apps: ['name'],
            builds: [
              'version', // Include version field
            ]
          },
          filter: {
            preReleaseVersion: [prereleaseVersionId],
          },
          sort: ['-version'], // Sort by uploadedDate descending
          limit: {
            betaBuildLocalizations: 40
          }
        })
        .then(builds => {
          if (builds.data.length > 0) {
            const latestBuild = builds.data[0];
            let version = latestBuild.attributes?.version;
            if (version) {
              resolve(version);
            } else {
              reject('No version found for the latest build.');
            }
          } else {
            reject('No builds found for the specified prerelease version.');
          }
        })
        .catch(err => {
          console.error('Error fetching builds:', err);
          reject(err);
        });
    });
  }


  buildNumber = async (appId: string, platform: string, projectFilePath: string) => {
    let latestVersionId = await this.getLatestAppVersionId(appId, platform);
    if (!latestVersionId) {
      console.error('No latest version ID found.');
      return;
    }
    console.log(`Latest version ID: ${latestVersionId}`);
    let latestBuildId = await this.getLatestBuildId(latestVersionId);
    console.log(`Latest build ID: ${latestBuildId}`);
    let nextBuildNumber = parseInt(latestBuildId) + 1;
    console.log(`Next build number: ${nextBuildNumber}`);
    if (projectFilePath === '') {
      return latestBuildId;
    }
    // Update the build number in the Xcode project file
    const configFilePath = projectFilePath + '/project.pbxproj'
    const configFile = fs.readFileSync(configFilePath, 'utf8');
    const newConfigFile = configFile.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextBuildNumber};`);
    fs.writeFileSync(configFilePath, newConfigFile, 'utf8');
    console.log(`Updated build number to ${nextBuildNumber} in ${configFilePath}`);
    return latestBuildId;
  }
}