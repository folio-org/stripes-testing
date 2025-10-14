import { recurse } from 'cypress-recurse';
import { ACCEPTED_DATA_TYPE_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../constants';
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

function processFile(
  uploadDefinitionId,
  fileId,
  sourcePath,
  jobExecutionId,
  uiKeyValue,
  jobProfileId,
  metaJobExecutionId,
  date,
) {
  return cy.okapiRequest({
    path: `data-import/uploadDefinitions/${uploadDefinitionId}/processFiles`,
    method: 'POST',
    body: {
      uploadDefinition: {
        id: uploadDefinitionId,
        metaJobExecutionId,
        status: 'LOADED',
        createDate: date,
        fileDefinitions: [
          {
            id: fileId,
            sourcePath,
            name: 'oneMarcBib.mrc',
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
        name: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      },
    },
    isDefaultSearchParamsRequired: false,
  });
}

function processFileWithSplitFiles(
  uploadDefinitionId,
  uploadDefinition,
  jobProfileId,
  jobProfileName,
) {
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

function getCreatedRecordInfo(jobExecutionId) {
  return cy.okapiRequest({
    path: `metadata-provider/jobLogEntries/${jobExecutionId}`,
    searchParams: { limit: 100 },
    isDefaultSearchParamsRequired: false,
  });
}

function getCreatedRecordInfoWithSplitFiles(jobExecutionId, recordId) {
  return recurse(
    () => cy.okapiRequest({
      path: `metadata-provider/jobLogEntries/${jobExecutionId}/records/${recordId}`,
      searchParams: { limit: 10000 },
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    }),
    (response) => response.status === 200,
    {
      timeout: 30_000,
      delay: 1_000,
    },
  );
}

function getJobStatus(jobExecutionId) {
  return cy.okapiRequest({
    path: `change-manager/jobExecutions/${jobExecutionId}`,
    isDefaultSearchParamsRequired: false,
  });
}

function getSplitStatus() {
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

function getParentJobExecutions() {
  // splitting process creates additional job executions for parent/child
  // so we need to query to get the correct job execution ID COMPOSITE_PARENT
  return cy.okapiRequest({
    path: 'metadata-provider/jobExecutions?limit=10000&sortBy=started_date,desc&subordinationTypeNotAny=COMPOSITE_CHILD&subordinationTypeNotAny=PARENT_SINGLE',
    isDefaultSearchParamsRequired: false,
  });
}

function getParentJobExecutionId(sourcePath) {
  function filterResponseBySourcePath(response) {
    const {
      body: { jobExecutions },
    } = response;
    return jobExecutions.find((jobExecution) => {
      return jobExecution.sourcePath === sourcePath;
    });
  }
  return recurse(
    () => getParentJobExecutions(),
    (response) => filterResponseBySourcePath(response) !== undefined,
    {
      timeout: 30_000,
      delay: 1_000,
    },
  ).then((response) => {
    return filterResponseBySourcePath(response).id;
  });
}

function getChildJobExecutionId(jobExecutionId) {
  return recurse(
    () => cy.okapiRequest({
      path: `change-manager/jobExecutions/${jobExecutionId}/children`,
      isDefaultSearchParamsRequired: false,
    }),
    (response) => response.body.jobExecutions.length > 0,
    {
      timeout: 30_000,
      delay: 1_000,
    },
  ).then((response) => {
    return response.body.jobExecutions[0].id;
  });
}

function getRecordSourceId(jobExecutionId) {
  return recurse(
    () => cy.okapiRequest({
      path: `metadata-provider/jobLogEntries/${jobExecutionId}`,
      isDefaultSearchParamsRequired: false,
      searchParams: { limit: 100, query: 'order=asc' },
      failOnStatusCode: false,
    }),
    (response) => response.body?.entries?.length > 0,
    {
      timeout: 30_000,
      delay: 1_000,
    },
  );
}

function uploadFileWithoutSplitFilesViaApi(filePathName, fileName, profileName) {
  const uiKeyValue = fileName;

  return uploadDefinitions(uiKeyValue, fileName).then((response) => {
    const fileDefinition = response.body.fileDefinitions[0];
    const { uploadDefinitionId, id, jobExecutionId } = fileDefinition;

    uploadBinaryMarcFile(filePathName, uploadDefinitionId, id);
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
            id,
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
        () => getJobStatus(jobExecutionId),
        (resp) => resp.body.status === 'COMMITTED' && resp.body.uiStatus === 'RUNNING_COMPLETE',
        {
          timeout: 3 * 60_000,
          delay: 5 * 1_000,
        },
      );

      getCreatedRecordInfo(jobExecutionId).then((recordResponse) => {
        // we can get relatedInstanceInfo and in it get idList or hridList
        const recordInfo = recordResponse.body.entries.map((entry) => ({
          instance: {
            id: entry.relatedInstanceInfo.length === 0 ? '' : entry.relatedInstanceInfo.idList[0],
            hrid:
              entry.relatedInstanceInfo.length === 0 ? '' : entry.relatedInstanceInfo.hridList[0],
          },
          holding: {
            id: entry.relatedHoldingsInfo.length === 0 ? '' : entry.relatedHoldingsInfo[0].id,
            hrid: entry.relatedHoldingsInfo.length === 0 ? '' : entry.relatedHoldingsInfo[0].hrid,
          },
          item: {
            id: entry.relatedItemInfo.length === 0 ? '' : entry.relatedItemInfo[0].id,
            hrid: entry.relatedItemInfo.length === 0 ? '' : entry.relatedItemInfo[0].hrid,
          },
          authority: {
            id: entry.relatedAuthorityInfo.length === 0 ? '' : entry.relatedAuthorityInfo.idList[0],
            hrid:
              entry.relatedAuthorityInfo.length === 0 ? '' : entry.relatedAuthorityInfo.hridList[0],
          },
        }));
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
                  processFileWithSplitFiles(
                    uploadDefinitionId,
                    uploadDefinition,
                    jobProfiles[0].id,
                    jobProfiles[0].name,
                  );
                },
              );

              getParentJobExecutionId(sourcePath).then((parentJobExecutionId) => {
                recurse(
                  () => getJobStatus(parentJobExecutionId),
                  (resp) => resp.body.status === 'COMMITTED' && resp.body.uiStatus === 'RUNNING_COMPLETE',
                  {
                    timeout: 3 * 60_000,
                    delay: 5 * 1_000,
                  },
                );
                getChildJobExecutionId(parentJobExecutionId).then((childJobExecutionId) => {
                  return getRecordSourceId(childJobExecutionId).then((resp3) => {
                    const sourceRecords = resp3.body.entries;
                    const infos = [];

                    return Promise.all(
                      sourceRecords.map((record) => {
                        return getCreatedRecordInfoWithSplitFiles(
                          childJobExecutionId,
                          record.sourceRecordId,
                        ).then((recordResponse) => {
                          const recordInfo = {
                            instance: {
                              id:
                                recordResponse.body.relatedInstanceInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedInstanceInfo.idList[0],
                              hrid:
                                recordResponse.body.relatedInstanceInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedInstanceInfo.hridList[0],
                            },
                            holding: {
                              id:
                                recordResponse.body.relatedHoldingsInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedHoldingsInfo[0].id,
                              hrid:
                                recordResponse.body.relatedHoldingsInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedHoldingsInfo[0].hrid,
                            },
                            item: {
                              id:
                                recordResponse.body.relatedItemInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedItemInfo.id,
                              hrid:
                                recordResponse.body.relatedItemInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedItemInfo.hrid,
                            },
                            authority: {
                              id:
                                recordResponse.body.relatedAuthorityInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedAuthorityInfo.idList[0],
                              hrid:
                                recordResponse.body.relatedAuthorityInfo.length === 0
                                  ? ''
                                  : recordResponse.body.relatedAuthorityInfo.hridList[0],
                            },
                          };
                          infos.push(recordInfo);
                        });
                      }),
                    ).then(() => {
                      // Return infos array after all asynchronous operations are completed
                      return infos;
                    });
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

export const DataImportAPI = {
  uploadFileWithoutSplitFilesViaApi,
  uploadFileWithSplitFilesViaApi,
  getSplitStatus,

  uploadFileViaApi: (filePathName, fileName, profileName) => {
    return getSplitStatus().then(({ body: { splitStatus } }) => {
      if (splitStatus) {
        uploadFileWithSplitFilesViaApi(filePathName, fileName, profileName);
      } else {
        uploadFileWithoutSplitFilesViaApi(filePathName, fileName, profileName);
      }
    });
  },

  /**
   * Uploads multiple files via API and collects IDs of created records.
   *
   * @param {Array|Object} files - An array of file objects or a single file object.
   * Each file object should have the following properties:
   *   - marc: The path of the file to be uploaded.
   *   - fileName: The name given to the file.
   *   - jobProfileToRun: The name of the profile to be used for the upload taken from DEFAULT_JOB_PROFILE_NAMES
   *   - propertyName: The type of record (e.g., 'instance', 'authority', 'holdings', 'item') that the file represents.
   *
   * @returns {Promise} - A promise that resolves with an object containing arrays of IDs for each type of created record:
   *   - createdInstanceIDs: Array of created instance record IDs.
   *   - createdAuthorityIDs: Array of created authority record IDs.
   *   - createdHoldingIDs: Array of created holdings record IDs.
   *   - createdItemIDs: Array of created item record IDs.
   */

  uploadFilesViaApi(files) {
    let filesList;
    if (!Array.isArray(files)) filesList = [files];
    else filesList = files;
    const ids = {
      createdInstanceIDs: [],
      createdAuthorityIDs: [],
      createdHoldingIDs: [],
      createdItemIDs: [],
    };
    filesList.forEach((file) => {
      this.uploadFileViaApi(file.marc, file.fileName, file.jobProfileToRun).then((response) => {
        response.forEach((record) => {
          switch (file.propertyName) {
            case 'instance':
              ids.createdInstanceIDs.push(record[file.propertyName].id);
              break;
            case 'authority':
              ids.createdAuthorityIDs.push(record[file.propertyName].id);
              break;
            case 'holdings':
              ids.createdHoldingIDs.push(record[file.propertyName].id);
              break;
            case 'item':
              ids.createdItemIDs.push(record[file.propertyName].id);
              break;
            default:
              throw new Error(`Unknown file type: ${file.propertyName}`);
          }
        });
      });
    });
    return cy.wrap(ids);
  },
};
