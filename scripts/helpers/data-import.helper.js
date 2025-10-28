/* eslint-disable no-console */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

async function uploadBinaryMarcFile(filePath, uploadDefinitionId, fileId) {
  const absolutePath = path.resolve(filePath);
  const fileStream = fs.createReadStream(absolutePath);
  const fileStats = fs.statSync(absolutePath);

  const response = await axios.post(
    `/data-import/uploadDefinitions/${uploadDefinitionId}/files/${fileId}`,
    fileStream,
    {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size,
      },
    },
  );
  return checkResponse(response, 'Uploading binary MARC file', 200);
}

async function processFile(
  uploadDefinitionId,
  fileId,
  sourcePath,
  jobExecutionId,
  uiKeyValue,
  jobProfileId,
  metaJobExecutionId,
  date,
  fileName,
) {
  const response = await axios.post(
    `/data-import/uploadDefinitions/${uploadDefinitionId}/processFiles`,
    {
      uploadDefinition: {
        id: uploadDefinitionId,
        metaJobExecutionId,
        status: 'LOADED',
        createDate: date,
        fileDefinitions: [
          {
            id: fileId,
            sourcePath,
            name: fileName || 'oneMarcBib.mrc',
            status: 'UPLOADED',
            jobExecutionId,
            uploadDefinitionId,
            createDate: date,
            uploadedDate: date,
            size: 2,
            uiKey: uiKeyValue,
          },
        ],
      },
      jobProfileInfo: {
        id: jobProfileId,
        name: 'Default - Create instance and SRS MARC Bib',
        dataType: 'MARC',
      },
    },
  );
  return checkResponse(response, 'Processing file', 204)?.data;
}

async function getCreatedRecordInfo(jobExecutionId) {
  const response = await axios.get(`/metadata-provider/jobLogEntries/${jobExecutionId}`, {
    params: { limit: 100 },
  });
  return checkResponse(response, 'Getting created record info', 200).data;
}

async function uploadFileWithoutSplitFilesViaApi(filePathName, fileName, profileName) {
  const { fileDefinitions } = await uploadDefinitions(filePathName, fileName);
  const { uploadDefinitionId, id: fileId, jobExecutionId } = fileDefinitions[0];

  // Upload binary MARC file
  await uploadBinaryMarcFile(filePathName, uploadDefinitionId, fileId);
  await wait(1500); // Wait for file conversion and upload

  const uploadDefinition = await uploadDefinitionWithId(uploadDefinitionId);
  const sourcePath = uploadDefinition.fileDefinitions[0].sourcePath;
  const metaJobExecutionId = uploadDefinition.metaJobExecutionId;
  const date = uploadDefinition.createDate;

  const jobProfile = (await getJobProfilesViaApi(profileName)).jobProfiles[0];
  await processFile(
    uploadDefinitionId,
    fileId,
    sourcePath,
    jobExecutionId,
    fileName,
    jobProfile.id,
    metaJobExecutionId,
    date,
    fileName,
  );

  await getJobStatus(jobExecutionId);

  const recordInfo = await getCreatedRecordInfo(jobExecutionId);
  return (
    recordInfo.entries.length > 0 &&
    recordInfo.entries[0].sourceRecordActionStatus === 'CREATED' &&
    recordInfo.entries[0].error === ''
  );
}

async function getSplitStatus() {
  const response = await axios.get('/data-import/splitStatus');
  return checkResponse(response, 'Getting split status', 200).data;
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

async function uploadFileViaApi(filePathName, fileName, profileName) {
  const { splitStatus } = await getSplitStatus();
  if (splitStatus) {
    return uploadFileWithSplitFilesViaApi(filePathName, fileName, profileName);
  } else {
    return uploadFileWithoutSplitFilesViaApi(filePathName, fileName, profileName);
  }
}

module.exports = {
  uploadFileViaApi,
  uploadFileWithSplitFilesViaApi,
  uploadFileWithoutSplitFilesViaApi,
  getSplitStatus,
  getJobStatus,
  getJobProfilesViaApi,
  uploadDefinitions,
  uploadDefinitionWithId,
  processFileWithSplitFiles,
  getUploadUrl,
  getTag,
  getParentJobExecutionId,
  getChildJobExecutionId,
  getRecordSourceId,
  getCreatedRecordInfoWithSplitFiles,
  uploadDefinitionWithAssembleStorageFile,
  uploadBinaryMarcFile,
  processFile,
  getCreatedRecordInfo,
  wait,
  checkResponse,
};
