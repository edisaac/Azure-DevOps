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
 
let gitRepos =[]
let repos =[]
let branchsList =[]

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
 
function obtenerReposGit(projects, callback) {

  console.log(`projects: ${JSON.stringify(projects.length, null, 2)}`)
  // arg1 now equals 'three'
  async.eachOfLimit(projects,10,getProjectReposGit, function(err) {
    if (err) return callback(err);
    callback();
  })
 
}

function obtenerBranchs(callback) {

  console.log(`Git Repos: ${JSON.stringify(gitRepos.length, null, 2)}`)

  // arg1 now equals 'three'
  async.eachOfLimit(gitRepos,10,getbranchs , function(err) {
    if (err) return callback(err);
    callback(null);
  })
 
}


function obtenerReposGitCommit(callback) {

  branchsList = branchsList.filter( item => !( ['history', 'develop', 'test'].includes(item.branch))  );
  console.log(`Git branchsList: ${JSON.stringify(branchsList.length, null, 2)}`)
  // arg1 now equals 'three'
  async.eachOfLimit(branchsList,10,getProjectReposGitCommits , function(err) {
    if (err) return callback(err);
    callback(null);
  })
 
}


 
function run(){
  async.waterfall([
    obtenerProyectos,     
    obtenerReposGit,
    obtenerBranchs,
    obtenerReposGitCommit
], function (err) {
  if (err)  console.log(err)


  console.log(`Git commits: ${JSON.stringify(commits.length, null, 2)}`)
  // stringify JSON Object
  
  commits=commits.sort((a, b) => b.defaultBranch-a.defaultBranch);
  
  fs.writeFile("commits.json", JSON.stringify(commits), 'utf8', function (err) {
      if (err) {
      console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
      }
      console.log("JSON file has been saved.");
  });

  fs.writeFile("branchsList.json",  JSON.stringify(branchsList), 'utf8', function (err) {
    if (err) {
    console.log("An error occured while writing JSON Object to File.");
        return console.log(err);
    }
    console.log("JSON file has been saved.");
});

  

  let uniqueObjArray = [
    ...new Map(commits.map((item) => [item["commitId"], item])).values(),
  ];


  console.log(`Git uniqueObjArray: ${JSON.stringify(uniqueObjArray.length, null, 2)}`)
  // stringify JSON Object
  var jsonContent = JSON.stringify(uniqueObjArray);
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

  const {projectId,projectName,id,name,defaultBranch,branch,creator} = reposList

  const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/git/repositories/${id}/commits?searchCriteria.itemVersion.version=${branch}&api-version=6.0&searchCriteria.fromDate=${commitDate}&searchCriteria.$top=${commitLen}`
 
  request.get(url, {timeout: 120000}
  , function(error, response, body) {
      if (error) return callback(error);

      if ( response.statusCode=200){
        const parsedBody = JSON.parse(body)          
        console.log(`GIT COMMITS:${projectName} - ${name} - ${branch}`)
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
                branchcreator:creator,
                commitId: commit.commitId, 
                branch:     branch     ,    
                defaultBranch: branch===defaultBranch?1:0,
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



const getbranchs = function(reposList,key, callback) {

  const {projectId,projectName,id,name,defaultBranch} = reposList

  const url = `https://${token}@dev.azure.com/${orgName}/${projectId}/_apis/git/repositories/${id}/refs?api-version=7.0`
  

  request.get(url, {timeout: 120000}
  , function(error, response, body) {
      if (error) return callback(error);

      if ( response.statusCode=200){
        const parsedBody = JSON.parse(body)          
        console.log(`ALL BRANCHS:${projectName} - ${name}`)
      
        if (parsedBody['count'] && parsedBody['count']>0 ){   
 
           parsedBody.value.forEach(branch => 
             
            branchsList.push( {            
              projectId:projectId,
              projectName:projectName,
              tipo:'git',
              name: name,
              id: id,              
              defaultBranch:defaultBranch,
              creator: branch.creator.displayName,
              branch:  (branch.name).replace('refs/heads/','') 
              })                      
            );  
        }  
      }  
      callback();
  } );


}
run()