const dotenv = require('dotenv');
const async = require("async");
dotenv.config();

const request =  require('request');
const vsoNodeApi = require('azure-devops-node-api');
// Create a personal from azure devops
const token = process.env.TOKEN;
// Url to your organization
const orgName=process.env.ORG_NAME
const commitLen=process.env.COMMITS_LEN
const serverUrl = `https://dev.azure.com/${orgName}`; 
let authHandler = vsoNodeApi.getPersonalAccessTokenHandler(token); 
let AzDO = new vsoNodeApi.WebApi(serverUrl, authHandler, undefined);

var commits = []
var gitRepos =[]

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

function obtenerProyectos(callback) { 
   getProjects(). then(projects => callback(null,projects));
}
 
function obtenerReposTfsCommits(projects, callback) {

  console.log(`projects: ${JSON.stringify(projects.length, null, 2)}`)
  // arg1 now equals 'three'
  async.eachOfLimit(projects,10,getProjectReposTfs, function(err) {
    if (err) return callback(err);
    callback(null, projects);
  })
 
}

 
function run(){
  async.waterfall([
    obtenerProyectos, 
    obtenerReposTfsCommits,
], function (err, result) {
  console.log(err)
  console.log(commits)
    // result now equals 'done'
});
}


const getProjectReposTfs = function(project,key, callback) {

      const {projectId,projectName} = project

      const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/tfvc/changesets?api-version=6.0&$top=${commitLen}`
     
      request.get(url, {timeout: 120000}
      , function(error, response, body) {
          if (error) return callback(error);

          if ( response.statusCode=200){
            const parsedBody = JSON.parse(body)          
            console.log(`${projectName}`)
          
            if (parsedBody['count']){    
               parsedBody.value.forEach(commit => 
                  commits.push( {            
                    projectId:projectId,
                    projectName:projectName,
                    tipo:'tfs',
                    name:`$/${projectName}`,
                    createdDate:commit.createdDate ,
                    uniqueName:commit.checkedInBy.uniqueName ,
                    comment:commit.comment
                  })                      
                ); 
            }
          }  
          callback();
      } );
  
   
}


run()