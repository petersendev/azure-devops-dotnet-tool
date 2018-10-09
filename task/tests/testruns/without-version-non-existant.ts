import { TaskMockRunner } from "vsts-task-lib/mock-run";
import * as semver from "semver";
import * as path from "path";
import * as uuidV4 from "uuid/v4";
import * as request from "request-promise";

// we have to find the latest nuget package version here, so we can mock the answer :(
const res = request("https://api-v2v3search-0.nuget.org/query?q=nbgv&prerelease=false&semVerLevel=2.0.0", { json: true }, (error, response, body) =>
{
    const projInfo = require("../package.json");
    const taskMain = path.join(__dirname, "../", projInfo.main);
    console.log("taskMain", taskMain, __dirname);
    let tmr: TaskMockRunner = new TaskMockRunner(taskMain);

    tmr.setInput("name", "nbgv");

    process.env["AGENT_TEMPDIRECTORY"] = path.resolve("tmp");
    process.env["AGENT_TOOLSDIRECTORY"] = path.resolve("tmp/tools");
    process.env["FAKE_UUID"] = uuidV4();

    const version = response.body.data[0].version;
    console.log("RESPONSE", version);


    const toolsPath = path.join(process.env["AGENT_TOOLSDIRECTORY"], "nbgv");
    const downloadPath = path.join(process.env["AGENT_TEMPDIRECTORY"], process.env["FAKE_UUID"]);
    const installedToolsPath = path.join(process.env["AGENT_TOOLSDIRECTORY"], "nbgv", version, "x64");
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

    // fix missing assertAgent function, see https://github.com/Microsoft/vsts-task-lib/issues/299
    var mt = require('vsts-task-lib/mock-task');
    mt.assertAgent = (minimum) =>
    {
        if (semver.lt(minimum, '2.115.0'))
        {
            throw new Error('Expected minimum agent version is 2.115.0');
        }
    };
    tmr.registerMockExport('mt', mt);

    tmr.run();

});