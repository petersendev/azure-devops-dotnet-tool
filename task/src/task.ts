import * as tl from "vsts-task-lib";
import * as ttl from "vsts-task-tool-lib"
import { ToolRunner } from 'vsts-task-lib/toolrunner';
import * as path from "path";
import * as execa from "execa";
import { tmpdir } from "os";
import * as uuidV4 from "uuid/v4";

async function run()
{
    try
    {
        const name = tl.getInput("name", true);
        const versionSpec = tl.getInput("versionSpec", false) || "";
        const checkLatest = false;

        await getTool(name, versionSpec, checkLatest);
    }
    catch (error)
    {
        console.error(error);
        tl.setResult(tl.TaskResult.Failed, error.message);
    }
}

async function getTool(name: string, versionSpec: string, checkLatest: boolean)
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
            // Explicit version was specified. No need to query for list of versions.
            //
            version = versionSpec;

            //
            // Check the cache for the resolved version.
            //
            tl.debug(`searching cached tool: ${name}@${version}`);
            toolPath = ttl.findLocalTool(name, version)
        }
        else
        {
            tl.debug(`searching cached tool versions for ${name}`);
            const versions = ttl.findLocalToolVersions(name);
            if (versions)
            {
                tl.debug(`found tool versions: ${versions.join(", ")}`);
            }
            else
            {
                tl.debug("no cached tools found");
            }
        }


        if (!toolPath)
        {
            //
            // Download, extract, cache
            //
            toolPath = await acquireTool(name, version);
        }
    }

    // //
    // // A tool installer intimately knows details about the layout of that tool
    // // for example, node binary is in the bin folder after the extract on Mac/Linux.
    // // layouts could change by version, by platform etc... but that's the tool installers job
    // //
    // if (osPlat != 'win32')
    // {
    //     toolPath = path.join(toolPath, 'bin');
    // }

    //
    // Prepend the tools path. This prepends the PATH for the current process and
    // instructs the agent to prepend for each task that follows.
    //
    tl.debug(`toolPath: ${toolPath}`);
    ttl.prependPath(toolPath);
}

async function acquireTool(name: string, version: string): Promise<string>
{
    if (version)
    {
        tl.debug(`acquiring ${name}@${version}`);
    }
    else
    {
        tl.debug(`acquiring ${name} (no version specified)`);
    }

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