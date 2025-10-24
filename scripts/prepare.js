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
  const response = await axios.get('/eholdings/kb-credentials');
  return response.data.data;
}

async function unassignEholdingsKbUsers() {
  const existingKbs = await getEholdingsKbs();
  const usersResponse = await axios.get(`/eholdings/kb-credentials/${existingKbs[0].id}/users`);
  const users = usersResponse.data.data;
  for (const user of users) {
    await axios.delete(`/eholdings/kb-credentials/${existingKbs[0].id}/users/${user.id}`);
  }
}

async function resetEholdingsKbs() {
  const existingKbs = await getEholdingsKbs();
  if (
    existingKbs.length !== 1 ||
    existingKbs[0].attributes.url !== process.env.KB_URL ||
    existingKbs[0].attributes.customerId !== process.env.KB_ID ||
    existingKbs[0].attributes.apiKey !== process.env.KB_KEY
  ) {
    for (const kb of existingKbs) {
      await axios.delete(`/eholdings/kb-credentials/${kb.id}`);
    }
    console.log('Configuring eHoldings KB');

    await axios.post(
      '/eholdings/kb-credentials',
      {
        data: {
          type: 'kbCredentials',
          attributes: {
            url: process.env.KB_URL,
            customerId: process.env.KB_ID,
            name: 'Knowledge base Auto',
            apiKey: process.env.KB_KEY,
          },
        },
      },
      { headers: { 'Content-type': 'application/vnd.api+json' } },
    );
    await unassignEholdingsKbUsers();
  }
}

async function getFieldProtectionSettings() {
  const response = await axios.get('/field-protection-settings/marc?limit=2000');
  return response.data.marcFieldProtectionSettings;
}

async function resetFieldProtectionSettings() {
  const existingSettings = await getFieldProtectionSettings();
  const userSettings = existingSettings.filter((setting) => setting.source === 'USER');
  console.log('Removing user field protection settings');
  for (const setting of userSettings) {
    await axios.delete(`/field-protection-settings/marc/${setting.id}`);
  }
}

async function deleteItemsForHoldings(holdingsId) {
  const itemsResponse = await axios.get(
    `inventory/items-by-holdings-id?query=holdingsRecordId==${holdingsId}`,
  );
  if (!itemsResponse.data.items) return;
  const deletePromises = [];
  // eslint-disable-next-line guard-for-in
  for (const item of itemsResponse.data.items) {
    deletePromises.push(axios.delete(`inventory/items/${item.id}`));
  }
  const settledDeletePromises = await Promise.allSettled(deletePromises);
  settledDeletePromises.forEach((settledPromise) => {
    if (settledPromise.status === 'rejected') console.log(JSON.stringify(settledPromise.reason));
  });
  await wait(500);
}

async function deleteHoldingsForInstance(instanceId) {
  const holdingsResponse = await axios(
    `holdings-storage/holdings?limit=200&query=instanceId="${instanceId}"`,
  );
  if (!holdingsResponse.data.holdingsRecords) return;
  const deletePromises = [];
  // eslint-disable-next-line guard-for-in
  for (const holdings of holdingsResponse.data.holdingsRecords) {
    await deleteItemsForHoldings(holdings.id);
    deletePromises.push(await axios.delete(`holdings-storage/holdings/${holdings.id}`));
  }
  const settledDeletePromises = await Promise.allSettled(deletePromises);
  settledDeletePromises.forEach((settledPromise) => {
    if (settledPromise.status === 'rejected') console.log(JSON.stringify(settledPromise.reason));
  });
  await wait(500);
}

async function removeAutotestInstances() {
  const batchSize = 15;
  const autotestInstances = await axios.get(
    '/search/instances?limit=500&query=(title all "autotest" or title all "AT_")',
  );
  if (!autotestInstances.data.instances) return;
  console.log('Removing autotest instances');
  const deletePromises = [];
  const deletePromisesBatches = [];
  for (const instance of autotestInstances.data.instances) {
    await deleteHoldingsForInstance(instance.id);
    deletePromises.push(axios.delete(`/instance-storage/instances/${instance.id}`));
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
  const autotestAuthorities = await axios.get(
    '/search/authorities?limit=500&query=(keyword="autotest" or keyword="AT_" and authRefType="Authorized")',
  );
  if (!autotestAuthorities.data.authorities) return;
  console.log('Removing autotest authorities');
  let counter = 1;
  for (const authority of autotestAuthorities.data.authorities) {
    if (!(counter % 100)) await getToken();
    if (!(counter % 15)) await wait(1500);
    await axios.delete(`/authority-storage/authorities/${authority.id}`);
    counter++;
  }
  await getToken();
}

async function removeAuthoritiesWithSpecificSource(sourceFileId) {
  const authoritiesWithSource = await axios.get(
    `/search/authorities?limit=500&query=(sourceFileId==("${sourceFileId}"))`,
  );
  if (
    authoritiesWithSource.data.authorities &&
    authoritiesWithSource.data.authorities.length <= 100
  ) {
    for (const [index, authority] of authoritiesWithSource.data.authorities.entries()) {
      if (!((index + 1) % 15)) await wait(1500);
      await axios.delete(`/authority-storage/authorities/${authority.id}`);
    }
    await wait(500);
  }
}

async function removeUserAuthoritySourceFiles() {
  const response = await axios.get('/authority-source-files?limit=200');
  const userSourceFiles = response.data.authoritySourceFiles.filter(
    (sourceFile) => sourceFile.source === 'local',
  );
  console.log('Removing user authority source files');
  let counter = 1;
  for (const sourceFile of userSourceFiles) {
    if (!(counter % 15)) await wait(1500);
    await removeAuthoritiesWithSpecificSource(sourceFile.id);
    await axios.delete(`/authority-source-files/${sourceFile.id}`);
    counter++;
  }
}

async function uploadDefinitions(keyValue, fileName) {
  const response = await axios.post('/data-import/uploadDefinitions', {
    fileDefinitions: [{ uiKey: keyValue, size: 2, name: fileName }],
  });
  return checkResponse(response, 'Uploading definition', 201).data;
}

async function uploadDefinitionWithId(uploadDefinitionId) {
  const response = await axios.get(`/data-import/uploadDefinitions/${uploadDefinitionId}`);
  return checkResponse(response, 'Uploading definition with id', 200).data;
}

async function processFileWithSplitFiles(
  uploadDefinitionId,
  uploadDefinition,
  jobProfileId,
  jobProfileName,
) {
  const response = await axios.post(
    `/data-import/uploadDefinitions/${uploadDefinitionId}/processFiles?defaultMapping=false`,
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
  const response = await axios.get(`/data-import/uploadUrl?filename=${fileName}`, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
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
  const response = await axios.get('/data-import-profiles/jobProfiles', {
    params: { query: `name="${profileName}"` },
  });
  return checkResponse(response, 'Getting job profile', 200).data;
}

async function getParentJobExecutionId(sourcePath) {
  let attempts = 10;
  while (attempts--) {
    const response = await axios.get('/metadata-provider/jobExecutions', {
      params: { limit: 10_000, sortBy: 'started_date,desc' },
    });
    checkResponse(response, `\tGetting parent job executions (${attempts} attempts left)`, 200);
    const jobExecution = response.data.jobExecutions.find((job) => job.sourcePath === sourcePath);
    if (jobExecution) return jobExecution.id;
    await wait(5_000);
  }
  throw new Error('Parent job execution not found');
}

async function getJobStatus(jobExecutionId) {
  let attempts = 16;
  while (attempts--) {
    const response = await axios.get(`/change-manager/jobExecutions/${jobExecutionId}`);
    checkResponse(
      response,
      `\t\tGetting parent job execution status (${attempts} attempts left)`,
      200,
    );
    const status = response.data;
    if (status.status === 'COMMITTED' && status.uiStatus === 'RUNNING_COMPLETE') return status;
    await wait(5_000);
  }
  throw new Error('Parent job execution status is not RUNNING_COMPLETE');
}

async function getChildJobExecutionId(jobExecutionId) {
  const response = await axios.get(`/change-manager/jobExecutions/${jobExecutionId}/children`);
  return checkResponse(response, '\tGetting child job execution id', 200).data.jobExecutions[0].id;
}

async function getRecordSourceId(jobExecutionId) {
  const response = await axios.get(`/metadata-provider/jobLogEntries/${jobExecutionId}`, {
    params: { limit: 100, query: 'order=asc' },
  });
  return checkResponse(response, 'Getting job Log Entries', 200).data.entries;
}

async function getCreatedRecordInfoWithSplitFiles(jobExecutionId, recordId) {
  let attempts = 10;
  while (attempts--) {
    const response = await axios.get(
      `/metadata-provider/jobLogEntries/${jobExecutionId}/records/${recordId}`,
      {
        params: { limit: 100 },
      },
    );
    checkResponse(response, `Getting created record info (${attempts} attempts left)`, 200);
    if (response.status === 200) return response.data;
    await wait(1_000);
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
    `/data-import/uploadDefinitions/${uploadId}/files/${fileId}/assembleStorageFile`,
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

async function getMarcSpecifications() {
  const response = await axios.get('/specification-storage/specifications?query=family=MARC');
  return response.data.specifications;
}

async function disableLccnDuplicateCheck() {
  console.log('Disabling LCCN duplicate check');
  try {
    const settingEntriesResponse = await axios.get('/settings/entries');
    const targetEntry = settingEntriesResponse.data.items.find(
      (entry) => entry.key === 'lccn-duplicate-check',
    );
    if (targetEntry && targetEntry.value.duplicateLccnCheckingEnabled === true) {
      await axios.put(`/settings/entries/${targetEntry.id}`, {
        data: {
          ...targetEntry,
          value: { duplicateLccnCheckingEnabled: false },
        },
      });
    }
  } catch (error) {
    console.error('Error disabling LCCN duplicate check:', error);
  }
}

async function resetMarcValidationRules() {
  console.log('Resetting MARC validation rules');
  try {
    const marcSpecifications = await getMarcSpecifications();
    const marcBibSpecId = marcSpecifications.find((spec) => spec.profile === 'bibliographic').id;
    const marcAuthSpecId = marcSpecifications.find((spec) => spec.profile === 'authority').id;
    await axios.post(`/specification-storage/specifications/${marcBibSpecId}/sync`);
    await axios.post(`/specification-storage/specifications/${marcAuthSpecId}/sync`);
  } catch (error) {
    console.error('Error resetting MARC validation rules:', error);
  }
}

(async () => {
  await getToken();

  try {
    const filesUploadedStatus = await uploadFileWithSplitFilesViaApi(
      'cypress/fixtures/marcFileForC375261.mrc',
      'autotest-00.mrc',
      'Default - Create SRS MARC Authority',
    );
    if (!filesUploadedStatus) process.exit(1);
  } catch (error) {
    process.exit(1);
  }

  await resetEholdingsKbs();
  await resetFieldProtectionSettings();
  await removeAutotestInstances();
  await removeAutotestAuthorities();
  await removeUserAuthoritySourceFiles();
  await disableLccnDuplicateCheck();
  await resetMarcValidationRules();
})();
