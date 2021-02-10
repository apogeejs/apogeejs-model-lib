const { src, dest, series, parallel, task } = require('gulp');
const releasePackageJson = require("../package.json");
const rollup = require('rollup');
const createResolveIdPlugins = require("./resolveIdPlugin.js");
const fs = require("fs");

//read data from the release package.json
let isDevRelease = releasePackageJson.DEV_RELEASE;
let version = releasePackageJson.version;
let repoName = releasePackageJson.name;
let esModuleFileName = releasePackageJson.module;
let npmModuleFileName = releasePackageJson.main;
let dependencies = releasePackageJson.dependencies;
let externalModuleMap = releasePackageJson.config.externalModuleMap ? releasePackageJson.config.externalModuleMap : {};  //add safety checks
let localPathAlias = releasePackageJson.config.localPathAlias;

if(!localPathAlias) throw new Error("Local path alias missing!");

//for absolute references
const PATH_TO_ABSOLUTE_ROOT = "../..";
let {esResolveId,npmResolveId}  = createResolveIdPlugins(__dirname,PATH_TO_ABSOLUTE_ROOT,repoName,localPathAlias,externalModuleMap);

//IMPORT THIS!!!

//version header for js files
function getJsFileHeader(fileName) {
    return "// File: " + fileName + "\n" +
        "// Version: " + version + "\n" +
        "// Copyright (c) 2016-2021 Dave Sutter\n" + 
        "// License: MIT\n";
}

//IMPORT THIS!!!

//==============================
// Top Level Values
//==============================
const RELEASE_PARENT_FOLDER = "../../apogeejs-admin";
const RELEASE_FOLDER = isDevRelease ?  "releases-dev" : "releases";
const RELEASE_NAME = "v" + version;
const OUTPUT_FOLDER = RELEASE_PARENT_FOLDER + "/" + RELEASE_FOLDER + "/" + repoName + "/" + RELEASE_NAME;


//IMPORT THIS!!!
//const RELEASE_FOLDER = getReleaseFolder(versionConfig);


//======================================
// Release Info
//======================================

//IMPORT THIS!!!
function makeSureReleaseNotPresent() {
    return new Promise( (resolve,reject) => {
        fs.stat(OUTPUT_FOLDER, (err, stats) => {
            if (err) resolve("File is not present!");
            else reject("Release is already present! If this should not be true, check the version numbers");
        });
    })
}

//base files - version info
const BASE_FILES = [
    "../package.json"
]

let copyReleaseInfoTask = parallel(
    () => copyFilesTask(BASE_FILES,OUTPUT_FOLDER)
)

//==============================
// Web App
//==============================

let genBunTest = (options,bundle,isWrite) => {
    for(let fileName in bundle) {
        console.log("Bundle fileName: " + fileName);
        let content = bundle[fileName];
        if(content.type == "chunk") {
            if(content.imports) {
                console.log("Imports: " + content.imports);
                content.imports = content.imports.map(importName => "/magicpath/" + importName);
                console.log("Imports 2: " + content.imports);
            }
        }
    }
}



function packageEsLibTask() {
    return rollup.rollup({
        input: '../src/' + esModuleFileName,
        plugins: [
            {resolveId: esResolveId, generateBundle: genBunTest}
        ]
    }).then(bundle => {
        return Promise.all([
            bundle.write(
                { 
                    file: OUTPUT_FOLDER + "/" + esModuleFileName,
                    format: 'es',
                    banner: getJsFileHeader(esModuleFileName)
                }
            )
        ]);
    });
}

function packageNpmLibTask() {
    return rollup.rollup({
        input: '../src/' + esModuleFileName,
        plugins: [
            {resolveId: npmResolveId}
        ]
    }).then(bundle => {
        return Promise.all([
            bundle.write(
                { 
                    file: OUTPUT_FOLDER + "/" + npmModuleFileName,
                    format: 'cjs',
                    banner: getJsFileHeader(npmModuleFileName)
                }
            )
        ]);
    });
}

//==============================
// Utility Tasks
//==============================

//copy files utility function
//IMPORT THIS!!!
function copyFilesTask(fileList,destFolder) {
    return src(fileList,{allowEmpty: true})
        .pipe(dest(destFolder));
}


//============================
// Exports
//============================

//This task executes the complete release
exports.release = series(
    makeSureReleaseNotPresent,
    parallel(
        copyReleaseInfoTask,
        packageEsLibTask,
        packageNpmLibTask
    )
);
