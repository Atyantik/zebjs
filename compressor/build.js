/**
 * Get the virtual machine module of the node
 * this will be used to execute the main file and execute it in this context
 * and configuration
 */
var vm = require('vm');

/**
 * Need File System module to deal with the files
 */
var fs = require("fs");

/**
 * Need underscore for object cloning and various other requirements
 */
var _ = require("underscore");

/**
 * Need uglify for compressing generated bundles
 */
var uglify = require('uglify-js');

/**
 * Glob for traversing file in modules
 */
var glob = require('glob');
/**
 * require Q for promise library
 */
var q = require("q");

/**
 * Include wrench to copy directories
 */
var wrench = require("wrench");
var util = require('util');
/**
 * Initialization of the variables for compilation purpose
 */

/**
 * The reference of this file will be taken
 * to get the configurations and optimization
 */
var mainFile = "main";

/**
 * This is the name of the output file that will be used
 * instead of the main file after optimization
 */
var outputFile = "main-build";

/**
 * Temporary file for overriding main file
 */
// NOTE:: This is just temporary name nothing to do with compilation
var tmpFile = "main-compiled";

/**
 * Src directory where all the developer write their code
 * the path of the directory is relative to this file
 */
var srcDir = "../app";

/**
 * TMP directory is the directory where all files from src folder are copied and
 * optimizations are carried out
 */
var tmpDir = "tmp";

/**
 * Buid directory is where all the final build JavaScript will
 * be kept after being optimized
 */
var buildDir = "../build";

/**
 * Read the main file and execute it in current context
 */
var htmlContent = fs.readFileSync(srcDir + "/" + "index.html", "utf-8"),
reg = /\<script .*data\-main=(.*) .*\<\/script\>/,
replaceScript = false;
htmlContent = htmlContent.replace(/<!--(.*?)-->/g,"");
var matchedJS = htmlContent.match(reg);

if(matchedJS.length && matchedJS.length > 1) {
    replaceScript = matchedJS[0];
    var mainJSFile = matchedJS[1].replace('\"', "").split("?")[0];
}
var content = fs.readFileSync(srcDir + "/" + mainJSFile, "utf-8");
/**
 * Change the baseurl as per compilation
 */
var relativeBuildBir = buildDir.replace()
    /**
     * Run the main file in current context to get the "z" variable
     * and its configurations
     */
vm.runInThisContext(content);

/**
 * Get the build basic configurations from the require config
 */
var buildConfig = _.extend({}, z.config);
/**
 * List of modules that are active and executed in project
 * these are required to traverse every files in the modules
 */
var modules = buildConfig.modules;


/**
 * We will need the version to decide the build version of the
 * application as a solution of build cache problem
 */
var version = buildConfig.version;

/**
 * Get the javascript files base url so that we can get the mapping
 * of the js modules.
 */
var baseUrl = buildConfig.baseUrl;

/**
 * Delete the extra fields added to the require config in "z.config"
 * variable, just cause it may cause some glitch in the build version
 */
delete buildConfig.modules;
delete buildConfig.version;
delete buildConfig.env;

/**
 * we will change the baseUrl to black as the
 * output file and other compress file will remain in same folder
 */
buildConfig.baseUrl = "";

/**
 * We need to copy all the files from src folder to tmp folder
 * also empty the tmp dir before doing this
 */
var removeFiles = function(files) {
    if (!_.isArray(files)) {
        files = [files];
    }
    for (var i in files) {
        try {
            fs.unlinkSync(files[i]);
        } catch (e) {
            wrench.rmdirSyncRecursive(files[i]);
        }
    }
}
var emptyTmpDir = function() {
    removeFiles(glob.sync(tmpDir + "/*", false));
};
var emptyBuildDir = function() {
    removeFiles(glob.sync(buildDir + "/*", false));
};

emptyTmpDir();
emptyBuildDir();

wrench.copyDirSyncRecursive(srcDir, "tmp", {
    forceDelete: true, // Whether to overwrite existing directory or not
    excludeHiddenUnix: false, // Whether to copy hidden Unix files or not (preceding .)
    preserveFiles: false, // If we're overwriting something and the file already exists, keep the existing
    preserveTimestamps: false, // Preserve the mtime and atime when copying files
    inflateSymlinks: true, // Whether to follow symlinks or not when copying files
});

/**
 * The file path to the main file
 * NOTE:: please note we are using r.js and thus creating a configuration
 * so that we don't have to deal with shim and other configurations
 */
buildConfig.name = tmpDir + "/" + tmpFile;
buildConfig.out = outputFile + ".js";
buildConfig.wrapShim = 'true';
buildConfig.preserveLicenseComments = 'false';

/**
 * Adding routers to the common files
 */
var routerRequirePath = [];
for (var i in buildConfig["paths"]) {
    buildConfig["paths"][i] = tmpDir + baseUrl + buildConfig["paths"][i];
}
for (var i in modules) {
    var p = "modules/" + modules[i] + "/router";
    buildConfig["paths"][p] = tmpDir + baseUrl + p;
    buildConfig["shim"][p] = {
        deps: ["zeb"]
    };
    routerRequirePath.push("\"" + p + "\"");
}

/**
 * Adding compile config to the compiled main file
 * and adding bundles to map the file
 */
var addCompileConfig = function() {
    wrench.mkdirSyncRecursive(buildDir + baseUrl, 0777);
    var compileConfig = {};
    compileConfig["bundles"] = {};
    if (content.indexOf("baseUrl") !== -1 && content.indexOf("buildBaseUrl") !== -1) {
        compileConfig['baseUrl'] = z.config.buildBaseUrl;
    }
    /**
     * Creating config file for modules
     */
    _.each(modules, function(module) {
        /**
         * Get all the files in modules
         */
        var files = glob.sync(tmpDir + baseUrl + "modules/" + module + "/**/*.*");
        /**
         * Initialize th bundles key in compile config
         */
        if (!_.isArray(compileConfig["bundles"][module])) {
            compileConfig["bundles"][module] = [];
        }
        var moduleJSData = "";
        /**
         * Loop through each file, ignoring the routers and
         */
        _.each(files, function(file) {
            if (file !== tmpDir + baseUrl +  "modules/" + module + "/router.js") {

                /**
                 * Read the file and compress it
                 */
                var path = file.replace(tmpDir + "/", "").replace(".js", "");
                var data = fs.readFileSync(file, 'utf-8');
                data = data.replace('define(', 'define(\'' + path + '\',');
                moduleJSData += ";" + data;
                compileConfig["bundles"][module].push(path);
            }
        });
        moduleJSData += ";";
        try {
            moduleJSData = uglify.minify(moduleJSData, {
                fromString: true,
                compress: {
                    drop_console: true,
                    drop_debugger: true
                }
            });
            moduleJSData = moduleJSData.code;
        } catch (ex) {
            console.log(ex)
        }
        if (moduleJSData && moduleJSData.length) {
            fs.writeFileSync(buildDir + baseUrl + module + ".js", moduleJSData, {
                encoding: 'utf-8'
            });
        }
    });
    // Adding bundles to the compile config
    var configString = "\n; var compileConfig = " + util.inspect(compileConfig, false, 10) + ";\n";
    content = configString + content;
};

var finalExecution = function() {
    routerRequirePath = "[" + routerRequirePath.join(",") + "]";

    // Require routers or necessary common files
    content += "\nrequire(" + routerRequirePath + ");\n";

    fs.writeFileSync("tmp/" + tmpFile + ".js", content, 'utf8');
    fs.writeFileSync('tmp/buildfile.js', util.inspect(buildConfig, false, 10), 'utf-8');

    var exec = require('child_process').exec;
    exec('node r.js -o tmp/buildfile.js', function(error, stdout, stderr) {
        if (error) {
            console.log(error);
            return;
        }
        console.log("LOG:: \n\n", stdout, stderr, "\n");

        // Create the folder for Javascript to reside
        wrench.mkdirSyncRecursive(buildDir + baseUrl, 0777);
        // Move the build File to buildDir
        fs.renameSync(tmpDir + "/" + outputFile + ".js", buildDir + baseUrl + outputFile + ".js");
        //emptyTmpDir();
    });
};
addCompileConfig();
finalExecution();
//copyAllToBuild();
