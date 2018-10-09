import { MockTestRunner } from "vsts-task-lib/mock-test";

import * as path from "path";
import * as fs from "fs-extra-promise";
import * as delay from "delay";

const showOutput = process.env.SYSTEM_DEBUG === "true";
console.log("showOutput", showOutput ? "true" : "false");

describe("the dotnet tool task", () =>
{
    beforeEach(async () =>
    {
        if (await fs.existsAsync("tmp"))
        {
            await fs.removeAsync("tmp");
        }
        await delay(100);
        await fs.ensureDirAsync("tmp/tools");
    });

    it("should succeed with only the tool name set and no tool already installed", async () =>
    {
        const tp = "dist-testruns/without-version-non-existant.js";
        const tr: MockTestRunner = new MockTestRunner(tp);


        tr.run();
        if (showOutput)
        {
            console.log(tr.stdout, tr.stderr, tr.succeeded);
        }

        expect(tr.succeeded).toBeTruthy();
        expect(tr.stdOutContained("acquiring nbgv (no version specified)")).toBeTruthy();
        expect(tr.stdOutContained("was successfully installed.")).toBeTruthy();

        expect(tr.stderr).toBeFalsy();

        expect(tr.warningIssues.length).toEqual(0);
        expect(tr.errorIssues.length).toEqual(0);

    });

    it("should succeed with name and full version and no tool already installed", async () =>
    {
        const tp = "dist-testruns/with-full-version-non-existant.js";
        const tr: MockTestRunner = new MockTestRunner(tp);

        tr.run();
        if (showOutput)
        {
            console.log(tr.stdout, tr.stderr, tr.succeeded);
        }

        expect(tr.succeeded).toBeTruthy();
        expect(tr.stdOutContained("acquiring nbgv@2.2.3")).toBeTruthy();
        expect(tr.stdOutContained("Tool 'nbgv' (version '2.2.3') was successfully installed.")).toBeTruthy();

        expect(tr.stderr).toBeFalsy();

        expect(tr.warningIssues.length).toEqual(0);
        expect(tr.errorIssues.length).toEqual(0);
    });

    it("should succeed with name and full version and tool already installed", async () =>
    {
        const tp = "dist-testruns/with-full-version-existant.js";
        const tr: MockTestRunner = new MockTestRunner(tp);

        tr.run();
        if (showOutput)
        {
            console.log(tr.stdout, tr.stderr, tr.succeeded);
        }

        expect(tr.succeeded).toBeTruthy();
        expect(tr.stdOutContained("acquiring nbgv@2.2.3")).toBeFalsy();
        expect(tr.stdOutContained("Tool 'nbgv' (version '2.2.3') was successfully installed.")).toBeFalsy();

        expect(tr.stderr).toBeFalsy();

        expect(tr.warningIssues.length).toEqual(0);
        expect(tr.errorIssues.length).toEqual(0);
    });
});