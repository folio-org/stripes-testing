import { recurse } from 'cypress-recurse';
import SettingsJobProfile from '../settings/dataImport/jobProfiles/jobProfiles';

function uploadDefinitions(keyValue, fileName) {
  return cy.okapiRequest({
    path: 'data-import/uploadDefinitions',
    body: {
      fileDefinitions: [
        {
          uiKey: keyValue,
          size: 2,
          name: fileName,
        },
      ],
    },
    method: 'POST',
    isDefaultSearchParamsRequired: false,
  });
}

function uploadBinaryMarcFile(fileName, uploadDefinitionId, fileId) {
  // convert file content in binary format (it's correct format for import)
  cy.fixture(fileName, 'binary')
    .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
    .then((blob) => {
      cy.wait(1500);
      cy.okapiRequest({
        path: `data-import/uploadDefinitions/${uploadDefinitionId}/files/${fileId}`,
        method: 'POST',
        body: blob,
        isDefaultSearchParamsRequired: false,
        contentTypeHeader: 'application/octet-stream',
      });
    });
}

function uploadDefinitionWithId(uploadDefinitionId) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}`,
    isDefaultSearchParamsRequired: false,
  });
}

function processFile(uploadDefinitionId, uploadDefinition, jobProfileId, jobProfileName) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}/processFiles?defaultMapping=false`,
    method: 'POST',
    body: {
      uploadDefinition,
      jobProfileInfo: {
        id: jobProfileId,
        name: jobProfileName,
        dataType: 'MARC',
      },
    },
    isDefaultSearchParamsRequired: false,
  });
}

function getCreatedRecordInfo(jobExecutionId, recordId) {
  return cy.okapiRequest({
    path: `metadata-provider/jobLogEntries/${jobExecutionId}/records/${recordId}`,
    isDefaultSearchParamsRequired: false,
  });
}

function getJodStatus(jobExecutionId) {
  return cy.okapiRequest({
    path: `change-manager/jobExecutions/${jobExecutionId}`,
    isDefaultSearchParamsRequired: false,
  });
}

function checkSplitStatus() {
  return cy.okapiRequest({
    path: 'data-import/splitStatus',
    isDefaultSearchParamsRequired: false,
  });
}

function getUploadUrl(fileName) {
  return cy.okapiRequest({
    path: `data-import/uploadUrl?filename=${fileName}`,
    contentTypeHeader: 'application/octet-stream',
    isDefaultSearchParamsRequired: false,
  });
}

function getTag(uploadUrl, file) {
  return cy.request({
    method: 'PUT',
    url: uploadUrl,
    body: file,
    headers: {
      'x-okapi-token': Cypress.env('token'),
      'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
    },
  });
}

function uploadDefinitionWithAssembleStorageFile(
  uploadDefinitionId,
  fileId,
  s3UploadId,
  s3UploadKey,
  s3Etag,
  blob,
) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}/files/${fileId}/assembleStorageFile`,
    body: {
      uploadId: s3UploadId,
      key: s3UploadKey,
      tags: [s3Etag],
      blob,
    },
    method: 'POST',
    isDefaultSearchParamsRequired: false,
  });
}

function getParentJobExecutionId() {
  // splitting process creates additional job executions for parent/child
  // so we need to query to get the correct job execution ID
  return cy.okapiRequest({
    path: 'metadata-provider/jobExecutions?limit=10000&sortBy=started_date,desc&subordinationTypeNotAny=COMPOSITE_CHILD&subordinationTypeNotAny=PARENT_SINGLE',
    isDefaultSearchParamsRequired: false,
  });
}

function getChildJobExecutionId(jobExecutionId) {
  return cy.okapiRequest({
    path: `change-manager/jobExecutions/${jobExecutionId}/children`,
    isDefaultSearchParamsRequired: false,
  });
}

function getRecordSourceId(jobExecutionId) {
  return cy.okapiRequest({
    path: `metadata-provider/jobLogEntries/${jobExecutionId}`,
    isDefaultSearchParamsRequired: false,
    searchParams: { limit: 100, query: 'order=asc' },
  });
}

function uploadFileWithoutSplitFilesViaApi(filePathName, fileName, profileName) {
  const uiKeyValue = fileName;

  return uploadDefinitions(uiKeyValue, fileName).then((response) => {
    const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
    const fileId = response.body.fileDefinitions[0].id;
    const jobExecutionId = response.body.fileDefinitions[0].jobExecutionId;

    uploadBinaryMarcFile(filePathName, uploadDefinitionId, fileId);
    // need to wait until file will be converted and uploaded
    cy.wait(1500);
    uploadDefinitionWithId(uploadDefinitionId).then((res) => {
      const sourcePath = res.body.fileDefinitions[0].sourcePath;
      const metaJobExecutionId = res.body.metaJobExecutionId;
      const date = res.body.createDate;

      SettingsJobProfile.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(
        ({ jobProfiles }) => {
          processFile(
            uploadDefinitionId,
            fileId,
            sourcePath,
            jobExecutionId,
            uiKeyValue,
            jobProfiles[0].id,
            metaJobExecutionId,
            date,
          );
        },
      );

      recurse(
        () => getJodStatus(jobExecutionId),
        (resp) => resp.body.status === 'COMMITTED' && resp.body.uiStatus === 'RUNNING_COMPLETE',
        {
          limit: 16,
          timeout: 80000,
          delay: 5000,
        },
      );

      getCreatedRecordInfo(jobExecutionId).then((resp) => {
        // we can get relatedInstanceInfo and in it get idList or hridList
        const recordInfo = resp.body;
        return recordInfo;
      });
    });
  });
}

function uploadFileWithSplitFilesViaApi(filePathName, fileName, profileName) {
  const uiKeyValue = fileName;

  return uploadDefinitions(uiKeyValue, fileName).then((response) => {
    const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
    const fileId = response.body.fileDefinitions[0].id;

    getUploadUrl(fileName).then((urlResponse) => {
      const s3UploadKey = urlResponse.body.key;
      const s3UploadId = urlResponse.body.uploadId;
      const uploadUrl = urlResponse.body.url;

      cy.fixture(filePathName).then((file) => {
        cy.wait(1500);
        getTag(uploadUrl, file).then((tagResponse) => {
          const s3Etag = tagResponse.headers.etag;

          uploadDefinitionWithAssembleStorageFile(
            uploadDefinitionId,
            fileId,
            s3UploadId,
            s3UploadKey,
            s3Etag,
          ).then(() => {
            uploadDefinitionWithId(uploadDefinitionId).then((uploadDefinitionResponse) => {
              const uploadDefinition = uploadDefinitionResponse.body;
              const sourcePath = uploadDefinitionResponse.body.fileDefinitions[0].sourcePath;

              SettingsJobProfile.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(
                ({ jobProfiles }) => {
                  processFile(
                    uploadDefinitionId,
                    uploadDefinition,
                    jobProfiles[0].id,
                    jobProfiles[0].name,
                  );
                },
              );

              getParentJobExecutionId().then((jobExecutionResponse) => {
                // TODO add waiting status COMMITED
                cy.wait(20000);
                const parentJobExecutionId = jobExecutionResponse.body.jobExecutions.find(
                  (exec) => exec.sourcePath === sourcePath,
                ).id;

                getChildJobExecutionId(parentJobExecutionId).then((resp2) => {
                  const childJobExecutionId = resp2.body.jobExecutions[0].id;

                  getRecordSourceId(childJobExecutionId).then((resp3) => {
                    const sourceRecordId = resp3.body.entries[0].sourceRecordId;

                    getCreatedRecordInfo(childJobExecutionId, sourceRecordId).then(
                      (recordResponse) => {
                        // we can get relatedInstanceInfo and in it get idList or hridList
                        const recordInfo = recordResponse.body;
                        return recordInfo;
                      },
                    );
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

export default {
  uploadFileWithoutSplitFilesViaApi,
  uploadFileWithSplitFilesViaApi,

  uploadFileViaApi: (filePathName, fileName, profileName) => {
    return checkSplitStatus().then((resp) => {
      if (resp.body.splitStatus === false) {
        uploadFileWithoutSplitFilesViaApi(filePathName, fileName, profileName);
      } else {
        uploadFileWithSplitFilesViaApi(filePathName, fileName, profileName);
      }
    });
  },
};
