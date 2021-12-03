import { TaskMockRunner } from "azure-pipelines-task-lib/mock-run";
import * as semver from "semver";
import * as path from "path";
import * as uuidV4 from "uuid/v4";

const version = "4.0.1-beta1-50";

const projInfo = require("../package.json");
const taskMain = path.join(__dirname, "../", projInfo.main);
console.log("taskMain", taskMain, __dirname);
let tmr: TaskMockRunner = new TaskMockRunner(taskMain);

tmr.setInput("name", "GitVersion.Tool");
tmr.setInput("versionSpec", version);
tmr.setInput("includePrerelease", "true");

process.env["AGENT_TEMPDIRECTORY"] = path.resolve("tmp");
process.env["AGENT_TOOLSDIRECTORY"] = path.resolve("tmp/tools");
process.env["FAKE_UUID"] = uuidV4();

const toolsPath = path.join(process.env["AGENT_TOOLSDIRECTORY"], "GitVersion.Tool");
const downloadPath = path.join(process.env["AGENT_TEMPDIRECTORY"], process.env["FAKE_UUID"]);
const installedToolsPath = path.join(process.env["AGENT_TOOLSDIRECTORY"], "GitVersion.Tool", version, "x64");
console.log("downloadPath", downloadPath, "toolsPath", toolsPath, "installedToolsPath", installedToolsPath);

const mockAnswers = {
    exist: {},
    stats: {},
    rmRF: {}
};
mockAnswers.exist[toolsPath] = false;
mockAnswers.stats[downloadPath] = { isDirectory: () => true };
mockAnswers.exist[installedToolsPath] = true;
mockAnswers.stats[installedToolsPath] = { isDirectory: () => true };
mockAnswers.rmRF[installedToolsPath] = { success: true };
mockAnswers.rmRF[`${installedToolsPath}.complete`] = { success: true };

tmr.setAnswers(mockAnswers);

tmr.run();