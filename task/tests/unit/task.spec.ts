import { MockTestRunner } from "azure-pipelines-task-lib/mock-test";

import * as path from "path";
import * as fs from "fs-extra-promise";
import delay from "delay";

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
        expect(tr.stdOutContained("acquiring nbgv@")).toBeTruthy();
        expect(tr.stdOutContained("was successfully installed.")).toBeTruthy();
        expect(tr.stdOutContained("detected installed version")).toBeTruthy();
        expect(tr.stderr).toBeFalsy();

        expect(tr.warningIssues.length).toEqual(0);
        expect(tr.errorIssues.length).toEqual(0);

    });

    it("should succeed with only the tool name set and no tool already installed for a pre-release version", async () =>
    {
        const tp = "dist-testruns/without-version-prerelease-non-existant.js";
        const tr: MockTestRunner = new MockTestRunner(tp);


        tr.run();
        if (showOutput)
        {
            console.log(tr.stdout, tr.stderr, tr.succeeded);
        }

        expect(tr.succeeded).toBeTruthy();
        expect(tr.stdOutContained("acquiring dotnet-reportgenerator-globaltool@")).toBeTruthy();
        expect(tr.stdOutContained("was successfully installed.")).toBeTruthy();
        expect(tr.stdOutContained("detected installed version")).toBeTruthy();

        expect(tr.stderr).toBeFalsy();

        expect(tr.warningIssues.length).toEqual(0);
        expect(tr.errorIssues.length).toEqual(0);

    });

    it("should succeed with full version and no tool already installed for a pre-release version and ignore casing", async () =>
    {
        const tp = "dist-testruns/with-full-version-non-existant-prerelease-casing.js";
        const tr: MockTestRunner = new MockTestRunner(tp);


        tr.run();
        if (showOutput)
        {
            console.log(tr.stdout, tr.stderr, tr.succeeded);
        }

        expect(tr.succeeded).toBeTruthy();
        expect(tr.stdOutContained("acquiring GitVersion.Tool@")).toBeTruthy();
        expect(tr.stdOutContained("was successfully installed.")).toBeTruthy();
        expect(tr.stdOutContained("detected installed version")).toBeTruthy();

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
        expect(tr.stdOutContained("detected installed version 2.2.3")).toBeTruthy();

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
        expect(tr.stdOutContained("detected installed version")).toBeFalsy();

        expect(tr.stderr).toBeFalsy();

        expect(tr.warningIssues.length).toEqual(0);
        expect(tr.errorIssues.length).toEqual(0);
    });

    it("should succeed with name and versionSpec and no tool already installed", async () =>
    {
        const tp = "dist-testruns/with-versionspec-non-existant.js";
        const tr: MockTestRunner = new MockTestRunner(tp);

        tr.run();
        if (showOutput)
        {
            console.log(tr.stdout, tr.stderr, tr.succeeded);
        }

        expect(tr.succeeded).toBeTruthy();
        expect(tr.stdOutContained("acquiring nbgv@2.1.84")).toBeTruthy();
        expect(tr.stdOutContained("Tool 'nbgv' (version '2.1.84') was successfully installed.")).toBeTruthy();
        expect(tr.stdOutContained("detected installed version 2.1.84")).toBeTruthy();

        expect(tr.stderr).toBeFalsy();

        expect(tr.warningIssues.length).toEqual(0);
        expect(tr.errorIssues.length).toEqual(0);
    });
});