import { TaskMockRunner } from "azure-pipelines-task-lib/mock-run";
import * as semver from "semver";
import * as path from "path";
import * as uuidV4 from "uuid/v4";

const version = "2.2.3";

const projInfo = require("../package.json");
const taskMain = path.join(__dirname, "../", projInfo.main);
console.log("taskMain", taskMain, __dirname);
let tmr: TaskMockRunner = new TaskMockRunner(taskMain);

tmr.setInput("name", "nbgv");
tmr.setInput("versionSpec", version);

process.env["AGENT_TEMPDIRECTORY"] = path.resolve("tmp");
process.env["AGENT_TOOLSDIRECTORY"] = path.resolve("tmp/tools");
process.env["FAKE_UUID"] = uuidV4();

const toolsPath = path.join(process.env["AGENT_TOOLSDIRECTORY"], "nbgv");
const downloadPath = path.join(process.env["AGENT_TEMPDIRECTORY"], process.env["FAKE_UUID"]);
const installedToolsPath = path.join(process.env["AGENT_TOOLSDIRECTORY"], "nbgv", version, "x64");
console.log("downloadPath", downloadPath, "toolsPath", toolsPath, "installedToolsPath", installedToolsPath);

const mockAnswers = {
    exist: {},
    stats: {},
    rmRF: {}
};
mockAnswers.exist[toolsPath] = true;
mockAnswers.exist[installedToolsPath] = true;
mockAnswers.stats[installedToolsPath] = { isDirectory: () => true };
mockAnswers.exist[`${installedToolsPath}.complete`] = true;

tmr.setAnswers(mockAnswers);

tmr.run();