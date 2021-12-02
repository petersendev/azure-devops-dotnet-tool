import * as tl from "azure-pipelines-task-lib";
import * as ttl from "azure-pipelines-tool-lib";
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
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
                version = await queryLatestMatch(name, versionSpec, includePrerelease);
                if (!version)
                {
                    throw new Error("could not determine version");
                }
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

async function queryLatestMatch(name: string, versionSpec: string, includePrerelease: boolean): Promise<string>
{
    tl.debug(`querying tool versions for ${name}${versionSpec ? `@${versionSpec}` : ""} ${includePrerelease ? "including pre-releases" : ""}`);

    var res = await request(`https://api-v2v3search-0.nuget.org/query?q=${encodeURIComponent(name)}&prerelease=${includePrerelease ? "true" : "false"}&semVerLevel=2.0.0`, { json: true });

    if (!res || !res.data || !res.data.length || !res.data[0].versions)
    {
        return null;
    }

    let versions = (<Array<{ version: string }>>res.data[0].versions).map(x => x.version);
    if (!versions || !versions.length)
    {
        return null;
    }

    // sanitize versions
    versions = versions.filter(x => semver.valid(x));

    tl.debug(`got versions (sanitized): ${versions.join(", ")}`);

    return versionSpec ? ttl.evaluateVersions(versions, versionSpec) : <string>semver.rsort(versions)[0];
}

async function acquireTool(name: string, version: string): Promise<string>
{
    tl.debug(`acquiring ${name}@${version}`);

    let tr: ToolRunner = tl.tool("dotnet");
    let tmpDir: string = getTempPath();
    tl.debug(`installing tool to ${tmpDir}`);
    let args = ["tool", "install", "--tool-path", tmpDir, name];

    if (version)
    {
        version = ttl.cleanVersion(version);
        args = args.concat(["--version", version]);
    }

    tr.arg(args);

    var res = tr.execSync();

    tl.debug(`tool install result: ${res.code === 0 ? "success" : "failure"} ${res.error ? res.error.message : ""}`)

    if (res.code)
    {
        throw new Error("error installing tool");
    }

    var regex = new RegExp(`^Tool '${name}' \\(version '([\\d\\.]+[^']*)'\\) was successfully installed\\.$`, "mi");
    var match = res.stdout.match(regex);
    if (match)
    {
        version = match[1];
        tl.debug(`detected installed version ${version}`);
    }

    if (!match || !version)
    {
        throw new Error("could not detect installed version");
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