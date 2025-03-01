import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";
import { Toolkit } from "actions-toolkit";
import { Minimatch } from "minimatch";
import { labeledStatement } from "@babel/types";

const toolkit = new Toolkit({
  event: ['pull_request.closed']
});

async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const configPath = core.getInput("configuration-path", { required: true });

    const prNumber = getPrNumber();
    if (!prNumber) {
      console.log("Could not get pull request number from context, exiting");
      return;
    }

    const client = new github.GitHub(token);

    core.debug(`fetching changed files for pr #${prNumber}`);
    // const changedFiles: string[] = await getChangedFiles(client, prNumber);
    // const labelGlobs: Map<string, string[]> = await getLabelGlobs(
    //   client,
    //   configPath
    // );

    const labelName: string = await getLabelName(client, configPath);
    const labels: string[] = [];
    toolkit.log.info("getting labels", labelName);

    // for (const [label, globs] of labelGlobs.entries()) {
    //   core.debug(`processing ${label}`);
    //   if (checkGlobs(changedFiles, globs)) {
    //     labels.push(label);
    //   }
    // }

    if (labelName !== undefined) {
      labels.push(labelName);
      await addLabels(client, prNumber, labels);
    }
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    console.log("getting pull request", pullRequest);
    return undefined;
  }

  return pullRequest.number;
}

// async function getChangedFiles(
//   client: github.GitHub,
//   prNumber: number
// ): Promise<string[]> {
//   const listFilesResponse = await client.pulls.listFiles({
//     owner: github.context.repo.owner,
//     repo: github.context.repo.repo,
//     pull_number: prNumber
//   });

//   const changedFiles = listFilesResponse.data.map(f => f.filename);

//   core.debug('found changed files:');
//   for (const file of changedFiles) {
//     core.debug('  ' + file);
//   }

//   return changedFiles;
// }

// async function getLabelGlobs(
//   client: github.GitHub,
//   configurationPath: string
// ): Promise<Map<string, string[]>> {
//   const configurationContent: string = await fetchContent(
//     client,
//     configurationPath
//   );

//   // loads (hopefully) a `{[label:string]: string | string[]}`, but is `any`:
//   const configObject: any = yaml.safeLoad(configurationContent);

//   // transform `any` => `Map<string,string[]>` or throw if yaml is malformed:
//   return getLabelGlobMapFromObject(configObject);
// }

async function getLabelName(
  client: github.GitHub,
  configurationPath: string
): Promise<string> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  );

  const configObject: any = yaml.safeLoad(configurationContent);

  return configObject["labelname"];
}

async function fetchContent(
  client: github.GitHub,
  repoPath: string
): Promise<string> {
  const response = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  });

  return Buffer.from(response.data.content, "base64").toString();
}

// function getLabelGlobMapFromObject(configObject: any): Map<string, string[]> {
//   const labelGlobs: Map<string, string[]> = new Map();
//   for (const label in configObject) {
//     if (typeof configObject[label] === 'string') {
//       labelGlobs.set(label, [configObject[label]]);
//     } else if (configObject[label] instanceof Array) {
//       labelGlobs.set(label, configObject[label]);
//     } else {
//       throw Error(
//         `found unexpected type for label ${label} (should be string or array of globs)`
//       );
//     }
//   }

//   return labelGlobs;
// }

// function checkGlobs(changedFiles: string[], globs: string[]): boolean {
//   for (const glob of globs) {
//     core.debug(` checking pattern ${glob}`);
//     const matcher = new Minimatch(glob);
//     for (const changedFile of changedFiles) {
//       core.debug(` - ${changedFile}`);
//       if (matcher.match(changedFile)) {
//         core.debug(` ${changedFile} matches`);
//         return true;
//       }
//     }
//   }
//   return false;
// }

async function addLabels(
  client: github.GitHub,
  prNumber: number,
  labels: string[]
) {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels
  });
}

run();
