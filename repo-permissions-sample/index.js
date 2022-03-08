const dotenv = require('dotenv');
const async = require("async");
const fs = require('fs');
dotenv.config();

const request =  require('request');
const vsoNodeApi = require('azure-devops-node-api');
// Create a personal from azure devops
const token = process.env.TOKEN;
// Url to your organization
const orgName=process.env.ORG_NAME
const commitLen=process.env.COMMITS_LEN
const commitDate=process.env.COMMITS_DATE
const serverUrl = `https://dev.azure.com/${orgName}`; 
let authHandler = vsoNodeApi.getPersonalAccessTokenHandler(token); 
let AzDO = new vsoNodeApi.WebApi(serverUrl, authHandler, undefined);

let commits = []
let allcommits = []
let gitRepos =[]
let repos =[]

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
    callback();
  })
 
}

function obtenerReposGitCommit(callback) {

  console.log(`Git Repos: ${JSON.stringify(gitRepos.length, null, 2)}`)
  // arg1 now equals 'three'
  async.eachOfLimit(gitRepos,10,getProjectReposGitCommits , function(err) {
    if (err) return callback(err);
    callback(null);
  })
 
}

function obtenerReposGitAllCommit(callback) {

  console.log(`Git Repos: ${JSON.stringify(gitRepos.length, null, 2)}`)
  // arg1 now equals 'three'
  async.eachOfLimit(gitRepos,10,getProjectReposGitAllCommits , function(err) {
    if (err) return callback(err);
    callback(null);
  })
 
}

 
function run(){
  async.waterfall([
    obtenerProyectos, 
    obtenerReposTfsCommits,
    obtenerReposGit,
    obtenerReposGitCommit,
    obtenerReposGitAllCommit
], function (err) {
  if (err)  console.log(err)


  console.log(`Git commits: ${JSON.stringify(commits.length, null, 2)}`)
  // stringify JSON Object
  var jsonContent = JSON.stringify(commits);
  fs.writeFile("commits.json", jsonContent, 'utf8', function (err) {
      if (err) {
      console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
      }
      console.log("JSON file has been saved.");
  });

  console.log(`Git allcommits: ${JSON.stringify(allcommits.length, null, 2)}`)
  allcommits.concat(commits);
  let uniqueObjArray = [
    ...new Map(allcommits.map((item) => [item["commitId"], item])).values(),
  ];
  console.log(`Git all: ${JSON.stringify(allcommits.length, null, 2)}`)

  console.log(`Git uniqueObjArray: ${JSON.stringify(uniqueObjArray.length, null, 2)}`)
  // stringify JSON Object
  var jsonContent = JSON.stringify(allcommits);
  fs.writeFile("allcommits.json", jsonContent, 'utf8', function (err) {
      if (err) {
      console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
      }
      console.log("JSON file has been saved.");
  });

 
  let reposjsonContent = JSON.stringify(repos);
  fs.writeFile("repos.json", reposjsonContent, 'utf8', function (err) {
      if (err) {
      console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
      }
      console.log("JSON file has been saved.");
  });

  
});
}


const getProjectReposTfsCommits = function(project,key, callback) {

      const {projectId,projectName} = project

      const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/tfvc/changesets?api-version=6.0&searchCriteria.fromDate=${commitDate}&$top=${commitLen}`
     
      request.get(url, {timeout: 120000}
      , function(error, response, body) {
          if (error) return callback(error);

          if ( response.statusCode=200){
            const parsedBody = JSON.parse(body)          
            console.log(`TFS COMMITS: ${projectName}`)
          
            if (parsedBody['count']){

              let repoItem=
              {            
                projectId:projectId,
                projectName:projectName,
                tipo:'tfs',
                name:`$/${projectName}` ,
                id:projectId,
                defaultBranch: 'tfs',
              }

              repos.push( {...repoItem,
                lastCommit:(parsedBody.value[0].createdDate).substring(0,10),
                lastCommitter:parsedBody.value[0].checkedInBy.uniqueName,
                count:parsedBody['count']
              });

               parsedBody.value.forEach(commit => 
                  commits.push( { ...repoItem,
                    commitId: projectName +'-'+commit.changesetId, 
                    createdDate:commit.createdDate ,
                    email:commit.checkedInBy.uniqueName ,
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

const getProjectReposGitCommits = function(reposList,key, callback) {

  const {projectId,projectName,id,name,defaultBranch} = reposList

  const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/git/repositories/${id}/commits?searchCriteria.itemVersion.version=${defaultBranch}&api-version=6.0&searchCriteria.fromDate=${commitDate}&searchCriteria.$top=${commitLen}`
 
  request.get(url, {timeout: 120000}
  , function(error, response, body) {
      if (error) return callback(error);

      if ( response.statusCode=200){
        const parsedBody = JSON.parse(body)          
        console.log(`GIT COMMITS:${projectName} - ${name}`)
        let repoItem=
        {            
          projectId:projectId,
          projectName:projectName,
          tipo:'git',
          name: name ,
          id:id,
          defaultBranch:defaultBranch,
        }


        if (parsedBody['count'] && parsedBody['count']>0 ){   
          repos.push( {...repoItem,
            lastCommit: (parsedBody.value[0].committer.date).substring(0,10),
            lastCommitter:parsedBody.value[0].committer.email,
            count:parsedBody['count']
          }); 
           parsedBody.value.forEach(commit =>               
              commits.push( {            
                projectId:projectId,
                projectName:projectName,
                tipo:'git',
                name: name, 
                commitId: commit.commitId,              
                defaultBranch: defaultBranch,
                createdDate:commit.committer.date ,
                email:commit.committer.email ,
                comment:commit.comment  
              })                      
            );  
        } else {               
          console.log(`----------GIT COMMITS:${projectName} - ${name}`)
          repos.push( {...repoItem});
        }
      }  
      callback();
  } );


}

const getProjectReposGitAllCommits = function(reposList,key, callback) {

  const {projectId,projectName,id,name,defaultBranch} = reposList

  const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/git/repositories/${id}/commits?api-version=6.0&searchCriteria.fromDate=${commitDate}&searchCriteria.$top=${commitLen}`
 
  request.get(url, {timeout: 120000}
  , function(error, response, body) {
      if (error) return callback(error);

      if ( response.statusCode=200){
        const parsedBody = JSON.parse(body)          
        console.log(`ALL GIT COMMITS:${projectName} - ${name}`)
      

        if (parsedBody['count'] && parsedBody['count']>0 ){   
 
           parsedBody.value.forEach(commit =>               
            allcommits.push( {            
                projectId:projectId,
                projectName:projectName,
                tipo:'git',
                name: name, 
                commitId: commit.commitId,              
                defaultBranch: 'Other',
                createdDate:commit.committer.date ,
                email:commit.committer.email ,
                comment:commit.comment  
              })                      
            );  
        }  
      }  
      callback();
  } );


}

run()