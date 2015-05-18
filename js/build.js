/**
 * Initialization of the variables for compilation purpose
 */
var appFile = "main";
var outputFile = "main-output";

var vm = require('vm');
var fs = require("fs");

var content = fs.readFileSync(appFile + ".js", "utf-8");
vm.runInThisContext(content);

var buildConfig = z.config;
var modules = buildConfig.modules;
var env = buildConfig.env;
var version = buildConfig.version;
delete buildConfig.modules;
delete buildConfig.version;
delete buildConfig.env;

buildConfig.baseUrl = "";
buildConfig.name = appFile + "-temp";
buildConfig.out = outputFile + ".js";
buildConfig.wrapShim = 'true';
buildConfig.preserveLicenseComments = 'false';

/**
 * Update paths to include router as well
 */
// for(var mod in modules) {
// 	var router = "modules/"+ modules[mod] +"/router";
// 	buildConfig["paths"][router] = router;
// 	buildConfig["shim"][router] = {deps: ["zeb"]};
// }

var util = require('util');
//content = content.replace("require([z.zebFile]);", "");

var routerRequirePath = [];
for(var i in modules) {
	var p = "modules/" + modules[i] + "/router";
	buildConfig["paths"][p] = p;
	buildConfig["shim"][p] = {deps: ["zeb"]};
	routerRequirePath.push("\""+ p +"\"");
}
routerRequirePath = "[" + routerRequirePath.join(",") + "]";

//content += "require([\"zeb\"], function(){"; 
content += "\nrequire("+ routerRequirePath +");\n";
//content += "});"

fs.writeFileSync( buildConfig.name + ".js", content);
fs.writeFileSync( 'buildfile.js', util.inspect(buildConfig, false, 10) , 'utf-8');

var exec = require('child_process').exec;
exec('node r.js -o buildfile.js', function (error, stdout, stderr) {
  console.log(error, stdout ,stderr);
  fs.unlinkSync('buildfile.js');
  fs.unlinkSync(appFile + "-temp.js");
});
