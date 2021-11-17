const dotenv = require('dotenv');
const async = require("async");
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

let repos = []


async function getProjects(){
  let coreApi = await AzDO.getCoreApi(); 
  let projects = await coreApi.getProjects();
  let constructedProjects = projects.map(function(project){
    return   {
      url: project['url'],
      projectId: project['id'],
      projectName: project['name'] 
    };
 }); 
 return constructedProjects
}
function myFirstFunction(callback) {
 
   getProjects(). then(projects => callback(null,projects));
}
 
function myLastFunction(projects, callback) {
  console.log(`projects: ${JSON.stringify(projects.length, null, 2)}`)
  // arg1 now equals 'three'
  async.eachSeries(projects,getProjectReposTfs, function(err) {

    console.log(`repos 1 ${JSON.stringify(repos, null, 2)}`)

    if (err) return callback(err);
    callback(null, 'done');
      
    
  })
 
}
function run2(){
  async.waterfall([
    myFirstFunction, 
    myLastFunction,
], function (err, result) {
  console.log(err)
  console.log(result)
    // result now equals 'done'
});
}


const getProjectReposTfs = function(project, callback) {

      const {projectId,projectName} = project
      const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/tfvc/changesets?api-version=6.0&$top=1`
      console.log(`${projectName}`)
      request.get(url, {timeout: 120000}
      , function(error, response, body) {
          if (error) return callback(error);

          if ( response.statusCode=200){
            const parsedBody = JSON.parse(body)            
            if (parsedBody['count']){             
              const obj =  {            
                projectId:projectId,
                projectName:projectName,
                tipo:'tfs',
                name:`$/${projectName}`,
                createdDate:parsedBody.value[0].createdDate ,
                uniqueName:parsedBody.value[0].checkedInBy.uniqueName ,
              }
              repos.push( obj) 
            }
          }  
          callback();
      } );
  
   
}


run2()