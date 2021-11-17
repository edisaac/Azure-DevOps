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
  async.eachOfLimit(projects,10,getProjectReposTfsCommits, function(err) {
    if (err) return callback(err);
    callback(null, projects);
  })
 
}

function obtenerReposGit(projects, callback) {

  console.log(`projects: ${JSON.stringify(projects.length, null, 2)}`)
  // arg1 now equals 'three'
  async.eachOfLimit(projects,10,getProjectReposGit, function(err) {
    if (err) return callback(err);
    callback(null, projects);
  })
 
}

 
function run(){
  async.waterfall([
    obtenerProyectos, 
    //obtenerReposTfsCommits,
    obtenerReposGit
], function (err, result) {
  if (err)  console.log(err)
   console.log(gitRepos)
    // result now equals 'done'
});
}


const getProjectReposTfsCommits = function(project,key, callback) {

      const {projectId,projectName} = project

      const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/tfvc/changesets?api-version=6.0&$top=${commitLen}`
     
      request.get(url, {timeout: 120000}
      , function(error, response, body) {
          if (error) return callback(error);

          if ( response.statusCode=200){
            const parsedBody = JSON.parse(body)          
            console.log(`TFS COMMITS: ${projectName}`)
          
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

const getProjectReposGit = function(project,key, callback) {

  const {projectId,projectName} = project

  const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/git/repositories?api-version=6.0`
 
  request.get(url, {timeout: 120000}
  , function(error, response, body) {
      if (error) return callback(error);

      if ( response.statusCode=200){
        const parsedBody = JSON.parse(body)          
        console.log(`GIT REPOS:${projectName}`)
      
        if (parsedBody['count']){    
           
           parsedBody.value.forEach(repo =>               
              gitRepos.push( {            
                projectId:projectId,
                projectName:projectName,
                tipo:'git',
                name: repo.name,
                id: repo.id,
                defaultBranch: repo["defaultBranch"]? (repo.defaultBranch).replace('refs/heads/','') :null 
              })                      
            ); 
        }
      }  
      callback();
  } );


}

run()