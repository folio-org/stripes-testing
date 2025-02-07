/* eslint-disable no-console */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cypressConfig = require('../cypress.config');
require('dotenv').config();

const envData = {
  apiBaseUrl: cypressConfig.env.OKAPI_HOST,
  tenant: cypressConfig.env.OKAPI_TENANT,
  username: cypressConfig.env.diku_login,
  password: cypressConfig.env.diku_password,
};

async function getToken() {
  axios.defaults.baseURL = envData.apiBaseUrl;
  axios.defaults.headers.common['x-okapi-tenant'] = envData.tenant;
  const response = await axios({
    method: 'post',
    url: '/authn/login-with-expiry',
    data: {
      username: envData.username,
      password: envData.password,
    },
  });
  const setCookieHeader = response.headers['set-cookie'];
  axios.defaults.headers.common.Cookie = setCookieHeader;
  axios.defaults.headers.common['Content-Type'] = 'application/json';
  axios.defaults.validateStatus = (status) => status < 500;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkResponse(response, message, validStatus = 200) {
  process.stdout.write(message.padEnd(32, '.'));
  if (response.status === validStatus) {
    process.stdout.write('OK\n');
  } else {
    process.stdout.write('ERROR ' + response.status + '\n');
  }
  return response;
}

async function getEholdingsKbs() {
  const response = await axios({
    url: '/eholdings/kb-credentials',
  });
  return response.data.data;
}

async function unassignEholdingsKbUsers() {
  const existingKbs = await getEholdingsKbs();
  const usersResponse = await axios({
    url: `/eholdings/kb-credentials/${existingKbs[0].id}/users`,
  });
  const users = usersResponse.data.data;
  for (const user of users) {
    await axios({
      method: 'DELETE',
      url: `/eholdings/kb-credentials/${existingKbs[0].id}/users/${user.id}`,
    });
  }
}

async function resetEholdingsKbs() {
  const existingKbs = await getEholdingsKbs();
  if (
    existingKbs.length !== 1 ||
    existingKbs[0].attributes.url !== process.env.EHOLDINGS_KB_URL ||
    existingKbs[0].attributes.customerId !== process.env.EHOLDINGS_KB_ID ||
    existingKbs[0].attributes.apiKey !== process.env.EHOLDINGS_KB_KEY
  ) {
    for (const kb of existingKbs) {
      await axios({
        method: 'DELETE',
        url: `/eholdings/kb-credentials/${kb.id}`,
      });
    }
    console.log('Configuring eHoldings KB');
    await axios({
      method: 'POST',
      url: '/eholdings/kb-credentials',
      headers: { 'Content-type': 'application/vnd.api+json' },
      data: {
        data: {
          type: 'kbCredentials',
          attributes: {
            url: process.env.EHOLDINGS_KB_URL,
            customerId: process.env.EHOLDINGS_KB_ID,
            name: 'Knowledge base Auto',
            apiKey: process.env.EHOLDINGS_KB_KEY,
          },
        },
      },
    });
    await unassignEholdingsKbUsers();
  }
}

async function getFieldProtectionSettings() {
  const response = await axios({
    url: '/field-protection-settings/marc?limit=2000',
  });
  return response.data.marcFieldProtectionSettings;
}

async function resetFieldProtectionSettings() {
  const existingSettings = await getFieldProtectionSettings();
  const userSettings = existingSettings.filter((setting) => setting.source === 'USER');
  console.log('Removing user field protection settings');
  for (const setting of userSettings) {
    await axios({
      method: 'DELETE',
      url: `/field-protection-settings/marc/${setting.id}`,
    });
  }
}

async function deleteItemsForHoldings(holdingsId) {
  const itemsResponse = await axios({
    url: `inventory/items-by-holdings-id?query=holdingsRecordId==${holdingsId}`,
  });
  const deletePromises = [];
  // eslint-disable-next-line guard-for-in
  for (const item of itemsResponse.data.items) {
    deletePromises.push(
      axios({
        method: 'DELETE',
        url: `inventory/items/${item.id}`,
      }),
    );
  }
  const settledDeletePromises = await Promise.allSettled(deletePromises);
  settledDeletePromises.forEach((settledPromise) => {
    if (settledPromise.status === 'rejected') console.log(JSON.stringify(settledPromise.reason));
  });
  await wait(500);
}

async function deleteHoldingsForInstance(instanceId) {
  const holdingsResponse = await axios({
    url: `holdings-storage/holdings?limit=200&query=instanceId="${instanceId}"`,
  });
  const deletePromises = [];
  // eslint-disable-next-line guard-for-in
  for (const holdings of holdingsResponse.data.holdingsRecords) {
    await deleteItemsForHoldings(holdings.id);
    deletePromises.push(
      await axios({
        method: 'DELETE',
        url: `holdings-storage/holdings/${holdings.id}`,
      }),
    );
  }
  const settledDeletePromises = await Promise.allSettled(deletePromises);
  settledDeletePromises.forEach((settledPromise) => {
    if (settledPromise.status === 'rejected') console.log(JSON.stringify(settledPromise.reason));
  });
  await wait(500);
}

async function removeAutotestInstances() {
  const batchSize = 15;
  const autotestInstances = await axios({
    url: '/search/instances?limit=500&query=(title all "autotest")',
  });
  console.log('Removing autotest instances');
  const deletePromises = [];
  const deletePromisesBatches = [];
  for (const instance of autotestInstances.data.instances) {
    await deleteHoldingsForInstance(instance.id);
    deletePromises.push(
      axios({
        method: 'DELETE',
        url: `/instance-storage/instances/${instance.id}`,
        validateStatus: () => true,
      }),
    );
  }
  for (let i = 0; i < deletePromises.length; i += batchSize) {
    const batch = [];
    for (let j = i; j < i + batchSize && j < deletePromises.length; j++) {
      batch.push(deletePromises[j]);
    }
    deletePromisesBatches.push(batch);
  }
  for (const [index, promisesBatch] of deletePromisesBatches.entries()) {
    if (!((index + 1) % 6)) await getToken();
    await Promise.allSettled(promisesBatch);
    await wait(1500);
  }
  await getToken();
}

async function removeAutotestAuthorities() {
  const autotestAuthorities = await axios({
    url: '/search/authorities?limit=500&query=(keyword="autotest" or keyword="auto" or keyword="C*")',
  });
  console.log('Removing autotest authorities');
  let counter = 1;
  for (const authority of autotestAuthorities.data.authorities) {
    if (!(counter % 100)) await getToken();
    if (!(counter % 15)) await wait(1500);
    await axios({
      method: 'DELETE',
      url: `/authority-storage/authorities/${authority.id}`,
      validateStatus: () => true,
    });
    counter++;
  }
  await getToken();
}

async function removeAuthoritiesWithSpecificSource(sourceFileId) {
  const authoritiesWithSource = await axios({
    url: `/search/authorities?limit=500&query=(sourceFileId==("${sourceFileId}"))`,
  });
  if (authoritiesWithSource.data.authorities.length <= 100) {
    for (const [index, authority] of authoritiesWithSource.data.authorities.entries()) {
      if (!((index + 1) % 15)) await wait(1500);
      await axios({
        method: 'DELETE',
        url: `/authority-storage/authorities/${authority.id}`,
        validateStatus: () => true,
      });
    }
    await wait(500);
  }
}

async function removeUserAuthoritySourceFiles() {
  const response = await axios({
    url: '/authority-source-files?limit=200',
  });
  const userSourceFiles = response.data.authoritySourceFiles.filter(
    (sourceFile) => sourceFile.source === 'local',
  );
  console.log('Removing user authority source files');
  let counter = 1;
  for (const sourceFile of userSourceFiles) {
    if (!(counter % 15)) await wait(1500);
    await removeAuthoritiesWithSpecificSource(sourceFile.id);
    await axios({
      method: 'DELETE',
      url: `/authority-source-files/${sourceFile.id}`,
      validateStatus: () => true,
    });
    counter++;
  }
}

async function uploadDefinitions(keyValue, fileName) {
  const response = await axios.post(`${envData.apiBaseUrl}/data-import/uploadDefinitions`, {
    fileDefinitions: [{ uiKey: keyValue, size: 2, name: fileName }],
  });
  return checkResponse(response, 'Uploading definition', 201).data;
}

async function uploadDefinitionWithId(uploadDefinitionId) {
  const response = await axios.get(
    `${envData.apiBaseUrl}/data-import/uploadDefinitions/${uploadDefinitionId}`,
  );
  return checkResponse(response, 'Uploading definition with id', 200).data;
}

async function processFileWithSplitFiles(
  uploadDefinitionId,
  uploadDefinition,
  jobProfileId,
  jobProfileName,
) {
  const response = await axios.post(
    `${envData.apiBaseUrl}/data-import/uploadDefinitions/${uploadDefinitionId}/processFiles?defaultMapping=false`,
    {
      uploadDefinition,
      jobProfileInfo: {
        id: jobProfileId,
        name: jobProfileName,
        dataType: 'MARC',
      },
    },
  );
  return checkResponse(response, 'Processing file', 204)?.data;
}

async function getUploadUrl(fileName) {
  const response = await axios.get(
    `${envData.apiBaseUrl}/data-import/uploadUrl?filename=${fileName}`,
    {
      headers: { 'Content-Type': 'application/octet-stream' },
    },
  );
  return checkResponse(response, 'Getting upload url', 200)?.data;
}

async function getTag(uploadUrl, filePath) {
  const absolutePath = path.resolve(filePath);
  const fileStream = fs.createReadStream(absolutePath);
  const fileStats = fs.statSync(absolutePath);

  const response = await axios.put(uploadUrl, fileStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileStats.size,
    },
  });
  return checkResponse(response, 'Uploading file')?.headers?.etag;
}

async function getJobProfilesViaApi(profileName) {
  const response = await axios.get(`${envData.apiBaseUrl}/data-import-profiles/jobProfiles`, {
    params: { query: `name="${profileName}"` },
  });
  return checkResponse(response, 'Getting job profile', 200).data;
}

async function getParentJobExecutionId(sourcePath) {
  let attempts = 10;
  while (attempts--) {
    const response = await axios.get(`${envData.apiBaseUrl}/metadata-provider/jobExecutions`, {
      params: { limit: 10000, sortBy: 'started_date,desc' },
    });
    checkResponse(response, `\tGetting parent job executions (${attempts} attempts left)`, 200);
    const jobExecution = response.data.jobExecutions.find((job) => job.sourcePath === sourcePath);
    if (jobExecution) return jobExecution.id;
    await new Promise((res) => setTimeout(res, 5_000));
  }
  throw new Error('Parent job execution not found');
}

async function getJobStatus(jobExecutionId) {
  let attempts = 16;
  while (attempts--) {
    const response = await axios.get(
      `${envData.apiBaseUrl}/change-manager/jobExecutions/${jobExecutionId}`,
    );
    checkResponse(
      response,
      `\t\tGetting parent job execution status (${attempts} attempts left)`,
      200,
    );
    const status = response.data;
    if (status.status === 'COMMITTED' && status.uiStatus === 'RUNNING_COMPLETE') return status;
    await new Promise((res) => setTimeout(res, 5_000));
  }
  throw new Error('Parent job execution status is not RUNNING_COMPLETE');
}

async function getChildJobExecutionId(jobExecutionId) {
  const response = await axios.get(
    `${envData.apiBaseUrl}/change-manager/jobExecutions/${jobExecutionId}/children`,
  );
  return checkResponse(response, '\tGetting child job execution id', 200).data.jobExecutions[0].id;
}

async function getRecordSourceId(jobExecutionId) {
  const response = await axios.get(
    `${envData.apiBaseUrl}/metadata-provider/jobLogEntries/${jobExecutionId}`,
    {
      params: { limit: 100, query: 'order=asc' },
    },
  );
  return checkResponse(response, 'Getting job Log Entries', 200).data.entries;
}

async function getCreatedRecordInfoWithSplitFiles(jobExecutionId, recordId) {
  let attempts = 10;
  while (attempts--) {
    const response = await axios.get(
      `${envData.apiBaseUrl}/metadata-provider/jobLogEntries/${jobExecutionId}/records/${recordId}`,
      {
        params: { limit: 100 },
      },
    );
    checkResponse(response, `Getting created record info (${attempts} attempts left)`, 200);
    if (response.status === 200) return response.data;
    await new Promise((res) => setTimeout(res, 1_000));
  }
  throw new Error('Record not found in job log entries');
}

async function uploadDefinitionWithAssembleStorageFile(
  uploadId,
  fileId,
  s3UploadId,
  s3UploadKey,
  s3Etag,
) {
  const response = await axios.post(
    `${envData.apiBaseUrl}/data-import/uploadDefinitions/${uploadId}/files/${fileId}/assembleStorageFile`,
    {
      uploadId: s3UploadId,
      key: s3UploadKey,
      tags: [s3Etag],
    },
  );
  return checkResponse(response, 'Assembling storage file', 204).data;
}

async function uploadFileWithSplitFilesViaApi(filePathName, fileName, profileName) {
  const { fileDefinitions } = await uploadDefinitions(filePathName, fileName);
  const uploadDefinitionId = fileDefinitions[0].uploadDefinitionId;
  const fileId = fileDefinitions[0].id;

  const uploadUrlData = await getUploadUrl(fileName);
  const s3Etag = await getTag(uploadUrlData.url, filePathName);
  await uploadDefinitionWithAssembleStorageFile(
    uploadDefinitionId,
    fileId,
    uploadUrlData.uploadId,
    uploadUrlData.key,
    s3Etag,
  );
  const uploadDefinition = await uploadDefinitionWithId(uploadDefinitionId);
  const jobProfile = (await getJobProfilesViaApi(profileName)).jobProfiles[0];
  await processFileWithSplitFiles(
    uploadDefinitionId,
    uploadDefinition,
    jobProfile.id,
    jobProfile.name,
  );
  const parentJobExecutionId = await getParentJobExecutionId(
    uploadDefinition.fileDefinitions[0].sourcePath,
  );
  await getJobStatus(parentJobExecutionId);
  const childJobExecutionId = await getChildJobExecutionId(parentJobExecutionId);
  const records = await getRecordSourceId(childJobExecutionId);
  const recordInfo = await getCreatedRecordInfoWithSplitFiles(
    childJobExecutionId,
    records[0].sourceRecordId,
  );

  return (
    recordInfo.sourceRecordId !== '' &&
    recordInfo.sourceRecordActionStatus === 'CREATED' &&
    recordInfo.error === ''
  );
}

(async () => {
  await getToken();
  try {
    console.error(
      (await uploadFileWithSplitFilesViaApi(
        'cypress/fixtures/marcFileForC375261.mrc',
        'autotest-00.mrc',
        'Default - Create SRS MARC Authority',
      ))
        ? '0'
        : '1',
    );
  } catch (e) {
    console.error('1');
  }
  await resetEholdingsKbs();
  await resetFieldProtectionSettings();
  await removeAutotestInstances();
  await removeAutotestAuthorities();
  await removeUserAuthoritySourceFiles();
})();
