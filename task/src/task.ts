import * as tl from "vsts-task-lib";
import * as ttl from "vsts-task-tool-lib"
import { ToolRunner } from 'vsts-task-lib/toolrunner';
import * as path from "path";
import * as execa from "execa";
import { tmpdir } from "os";
import * as uuidV4 from "uuid/v4";
import * as semver from "semver";
import * as request from "request-promise";
import { RequestPromise } from "request-promise";

async function run()
{
    try
    {
        const name = tl.getInput("name", true);
        const versionSpec = tl.getInput("versionSpec", false) || "";
        const checkLatest = tl.getBoolInput("checkLatest", false);
        const includePrerelease = tl.getBoolInput("includePrerelease", false);

        await getTool(name, versionSpec, checkLatest, includePrerelease);
    }
    catch (error)
    {
        console.error(error);
        tl.setResult(tl.TaskResult.Failed, error.message);
    }
}

async function getTool(name: string, versionSpec: string, checkLatest: boolean, includePrerelease: boolean)
{
    if (versionSpec && ttl.isExplicitVersion(versionSpec))
    {
        checkLatest = false; // check latest doesn't make sense when explicit version
    }

    let toolPath: string;

    if (!toolPath)
    {
        let version: string;
        if (ttl.isExplicitVersion(versionSpec))
        {
            //
            // Check the cache for the resolved version.
            //
            if (!checkLatest)
            {
                //
                // Explicit version was specified. No need to query for list of versions.
                //
                version = versionSpec;

                tl.debug(`searching cached tool: ${name}@${version}`);
                toolPath = ttl.findLocalTool(name, version);
            }
        }
        else
        {
            if (!checkLatest)
            {
                tl.debug(`searching cached tool versions for ${name}`);
                const versions = ttl.findLocalToolVersions(name);
                if (versions && versions.length > 0)
                {
                    tl.debug(`found tool versions: ${versions.join(", ")}`);
                    const sorted = semver.rsort(versions);
                    version = <string>sorted[0];
                    tl.debug(`searching cached tool: ${name}@${version}`);
                    toolPath = ttl.findLocalTool(name, version);
                }
                else
                {
                    tl.debug("no cached tools found");
                }
            }
        }

        if (!toolPath)
        {
            if (!version)
            {
                version = await queryLatestMatch(versionSpec, includePrerelease);
            }

            toolPath = ttl.findLocalTool(name, version) || await acquireTool(name, version);
        }
    }

    //
    // Prepend the tools path. This prepends the PATH for the current process and
    // instructs the agent to prepend for each task that follows.
    //
    tl.debug(`toolPath: ${toolPath}`);
    ttl.prependPath(toolPath);
}

async function queryLatestMatch(versionSpec: string, includePrerelease: boolean): Promise<string>
{
    tl.debug(`querying tool versions for ${versionSpec} ${includePrerelease ? "including pre-releases" : ""}`);

    var res = await request(`https://api-v2v3search-0.nuget.org/query?q=nbgv&prerelease=${includePrerelease ? "true" : "false"}&semVerLevel=2.0.0`, { json: true });

    if (!res || !res.data || !res.data.length || !res.data[0].versions)
    {
        return null;
    }

    const versions = (<Array<{ version: string }>>res.data[0].versions).map(x => x.version);
    tl.debug(`got versions: ${versions.join(", ")}`);
    return ttl.evaluateVersions(versions, versionSpec);
}

async function acquireTool(name: string, version: string): Promise<string>
{
    tl.debug(`acquiring ${name}@${version}`);

    let tr: ToolRunner = tl.tool("dotnet");
    let tmpDir: string = getTempPath();
    tl.debug(`installing tool to ${tmpdir}`);
    let args = ["tool", "install", "--tool-path", tmpDir, name];

    if (version)
    {
        version = ttl.cleanVersion(version);
        args = args.concat(["--version", version]);
    }

    tr.arg(args);

    var res = tr.execSync();

    var regex = /'([\d\.]+[^']*)'/;
    var match = res.stdout.match(regex);
    if (match)
    {
        version = match[1];
        tl.debug(`detected installed version ${version}`);
    }

    if (!version)
    {
        tl.setResult(tl.TaskResult.Failed, "could not detect installed version");
        return;
    }

    return await ttl.cacheDir(tmpDir, name, version);
}

function getTempPath(): string
{
    let tempPath = path.join(getAgentTemp(), process.env["FAKE_UUID"] || uuidV4())

    if (tl.exist(tempPath) === false)
    {
        tl.mkdirP(tempPath);
    }

    return tempPath;
}

function getAgentTemp(): string
{
    tl.assertAgent('2.115.0');
    let tempDirectory = tl.getVariable('Agent.TempDirectory');
    if (!tempDirectory)
    {
        throw new Error('Agent.TempDirectory is not set');
    }

    return tempDirectory;
}

run();