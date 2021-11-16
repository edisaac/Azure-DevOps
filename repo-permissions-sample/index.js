const dotenv = require('dotenv');
dotenv.config();

const request =  require('request');
const vsoNodeApi = require('azure-devops-node-api');
// Create a personal from azure devops
const token = process.env.TOKEN;
// Url to your organization
const orgName=process.env.ORG_NAME
const serverUrl = `https://dev.azure.com/${orgName}`; 
let authHandler = vsoNodeApi.getPersonalAccessTokenHandler(token); 
let AzDO = new vsoNodeApi.WebApi(serverUrl, authHandler, undefined);

async function run() {
  var constructedProjects = {}
  
  try {
    var coreApi = await AzDO.getCoreApi(); 
    var projects = await coreApi.getProjects();
     
    var i;
      for (i = 0; i < projects.length; i++) { 
        const project = projects[i]
        const obj = {
          url: project['url'],
          projectId: project['projectId'],
          projectName: project['name'] 
        }
        if (!constructedProjects[project['projectName']]){
          constructedProjects[project['projectName']] = [obj]
        } else {
          constructedProjects[project['projectName']].push(obj)
        }
      }
      const projectsToUse = await constructedProjects
      const finalConstruct = await constructTeams(projectsToUse)
      return finalConstruct
  } catch(err) {
    console.log(`err 1 ${JSON.stringify(err, null, 2)}`)
  }
}

const constructTeams = async (projects) => {
  const obj = {}
  var coreApi = await AzDO.getCoreApi(); 
  const ids = Object.keys(projects)
  await asyncForEach(ids, async (key) => {
    await asyncForEach(projects[key], async (el) => {
      const temp = {}
      const {projectId} = el
      const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/tfvc/changesets?api-version=6.0&$top=1`
       
      request.get(url
      , function(error, response, body) {
          const parsedBody = JSON.parse(body)
          console.log(`tfs: ${JSON.stringify(parsedBody, null, 2)}`)
          
      } );
 
    })
  })
  console.log(`Org: ${JSON.stringify(obj, null, 2)}`)
  return obj
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

run()