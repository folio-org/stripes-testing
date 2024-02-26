// import { recurse } from 'cypress-recurse';
// import { ACCEPTED_DATA_TYPE_NAMES, JOB_STATUS_NAMES } from '../../constants';
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
  uploadDefinition,
  // metaJobExecutionId,
  // sourcePath,
  // jobExecutionId,
  // uiKeyValue,
  jobProfileId,
  // date,
  // fileName,
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
      // uploadDefinition: {
      //   // 'id':'2d0fa1df-b7c5-4574-94c1-e38f94714fae',
      //   metaJobExecutionId,
      //   status: 'LOADED',
      //   createDate: date,
      //   fileDefinitions: [
      //     {
      //       // 'id':'25222a97-6000-43d7-9c07-97803bc1983c',
      //       sourcePath,
      //       name: fileName,
      //       status: 'UPLOADED',
      //       jobExecutionId,
      //       uploadDefinitionId,
      //       createDate: date,
      //       uploadedDate: date,
      //       size: 2,
      //       uiKey: uiKeyValue
      //     }
      //   ],
      // },
      // jobProfileInfo: {
      //   id: jobProfileId,
      //   name: jobProfileName,
      //   dataType: 'MARC'
      // }
    },
    isDefaultSearchParamsRequired: false,
  });
}

// function getCreatedRecordInfo(jobExecutionId) {
//   return cy.okapiRequest({
//     path: `metadata-provider/jobLogEntries/${jobExecutionId}`,
//     isDefaultSearchParamsRequired: false,
//     searchParams: { limit: 100 },
//   });
// }

// function getJodStatus(jobExecutionId) {
//   return cy.okapiRequest({
//     path: `change-manager/jobExecutions/${jobExecutionId}`,
//     isDefaultSearchParamsRequired: false,
//   });
// }

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
    body: { file },
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

export default {
  uploadDefinitions,
  uploadBinaryMarcFile,
  processFile,
  checkSplitStatus,
  getUploadUrl,
  uploadDefinitionWithAssembleStorageFile,

  uploadFileViaApi: (filePathName, fileName, profileName) => {
    // checkSplitStatus().then(resp => {
    // if (resp.body.splitStatus === false) {
    // const uiKeyValue = fileName;

    // return uploadDefinitions(uiKeyValue, fileName).then((response) => {
    //   const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
    //   const fileId = response.body.fileDefinitions[0].id;
    //   const jobExecutionId = response.body.fileDefinitions[0].jobExecutionId;

    //   uploadBinaryMarcFile(filePathName, uploadDefinitionId, fileId);
    //   // need to wait until file will be converted and uploaded
    //   cy.wait(1500);
    //   uploadDefinitionWithId(uploadDefinitionId).then((res) => {
    //     const sourcePath = res.body.fileDefinitions[0].sourcePath;
    //     const metaJobExecutionId = res.body.metaJobExecutionId;
    //     const date = res.body.createDate;

    //     SettingsJobProfile.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(
    //       ({ jobProfiles }) => {
    //         processFile(
    //           uploadDefinitionId,
    //           fileId,
    //           sourcePath,
    //           jobExecutionId,
    //           uiKeyValue,
    //           jobProfiles[0].id,
    //           metaJobExecutionId,
    //           date,
    //         );
    //       },
    //     );

    //     recurse(
    //       () => getJodStatus(jobExecutionId),
    //       (resp) => resp.body.status === 'COMMITTED' && resp.body.uiStatus === 'RUNNING_COMPLETE',
    //       {
    //         limit: 16,
    //         timeout: 80000,
    //         delay: 5000,
    //       },
    //     );

    //     getCreatedRecordInfo(jobExecutionId).then((resp) => {
    //       // we can get relatedInstanceInfo and in it get idList or hridList
    //       const recordInfo = resp.body;
    //       return recordInfo;
    //     });
    //   });
    // });
    // } else {
    // const uiKeyValue = fileName;

    // uploadDefinitions(uiKeyValue, fileName).then((response) => {
    //   const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
    //   const fileId = response.body.fileDefinitions[0].id;
    //   // const jobExecutionId = response.body.fileDefinitions[0].jobExecutionId;

    //   getUploadUrl(fileName).then((respo) => {
    //     const s3UploadKey = respo.body.key;
    //     const s3UploadId = respo.body.uploadId;
    //     const uploadUrl = respo.body.url;

    //     cy.fixture(filePathName, 'binary')
    //       .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
    //       .then((blob) => {
    //         cy.wait(1500);
    //         getTag(uploadUrl, blob)
    //           .then((re) => {
    //             const s3Etag = re.headers.etag;

    //             uploadDefinitionWithAssembleStorageFile(uploadDefinitionId, fileId, s3UploadId, s3UploadKey, s3Etag);
    //             //   SettingsJobProfile.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(
    //             //     ({ jobProfiles }) => {
    //             uploadDefinitionWithId(uploadDefinitionId).then((res) => {
    //               const sourcePath = res.body.fileDefinitions[0].sourcePath;
    //               const metaJobExecutionId = res.body.metaJobExecutionId;
    //               const date = res.body.createDate;

    //               return cy.okapiRequest({
    //                 path: 'metadata-provider/jobExecutions',
    //                 qs: {
    //                   subordinationTypeNotAny: ['COMPOSITE_CHILD', 'PARENT_SINGLE'],
    //                   sortBy: 'started_date,desc',
    //                 },
    //                 searchParams: { limit: 10000 },
    //                 isDefaultSearchParamsRequired: false,
    //               }).then((re2) => {
    //                 console.log('Response:', re2.body); // Log the entire response to inspect its structure
    //                 console.log('SourcePath:', sourcePath); // Log the value of sourcePath
    //                 const foundExecution = re2.body.jobExecutions.find(exec => exec.sourcePath === sourcePath);
    //                 console.log('Found Execution:', foundExecution);
    //                 // console.log();
    //                 // console.log(re2.body.jobExecutions.find(exec => exec.sourcePath === sourcePath));
    //                 cy.pause();
    //                 // const parentJobExecution = re2.body.jobExecutions.find(exec => exec.sourcePath === sourcePath).id;

    //                 // console.log(parentJobExecution);
    //                 // cy.pause();

    //                 // return cy.okapiRequest({
    //                 //   path: `metadata-provider/jobExecutions/${parentJobExecution}/children`,
    //                 //   isDefaultSearchParamsRequired: false,
    //                 // }).then(res3 => {
    //                 // // console.log(res3);
    //                 //   // const childJobExecutionIds = res3.jobExecutions[*].id
    //                 // });

    //                 // processFile(
    //                 //   uploadDefinitionId,
    //                 //   sourcePath,
    //                 //   parentJobExecution,
    //                 //   uiKeyValue,
    //                 //   jobProfiles[0].id,
    //                 //   date,
    //                 //   fileName,
    //                 //   profileName,
    //                 // );
    //               });
    //               // });
    //             });
    //           });
    //       });
    //   });
    // });
    // //   });
    // // });

    const uiKeyValue = fileName;

    return uploadDefinitions(uiKeyValue, fileName).then((response) => {
      const uploadDefinitionId = response.body.fileDefinitions[0].uploadDefinitionId;
      const fileId = response.body.fileDefinitions[0].id;
      // const jobExecutionId = response.body.fileDefinitions[0].jobExecutionId;
      // const metaJobExecutionId = response.metaJobExecutionId;
      // const createDate = response.body.createDate;
      // const uploadedDate = createDate;

      cy.fixture(filePathName, 'binary')
        .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
        .then((blob) => {
          cy.wait(1500);
          getUploadUrl(fileName).then((respo) => {
            const s3UploadKey = respo.body.key;
            const s3UploadId = respo.body.uploadId;
            const uploadUrl = respo.body.url;

            getTag(uploadUrl, blob).then((re) => {
              const s3Etag = re.headers.etag;

              uploadDefinitionWithAssembleStorageFile(
                uploadDefinitionId,
                fileId,
                s3UploadId,
                s3UploadKey,
                s3Etag,
              ).then(() => {
                uploadDefinitionWithId(uploadDefinitionId).then((res) => {
                  const uploadDefinition = res.body;
                  cy.pause();
                  // const sourcePath = res.body.fileDefinitions[0].sourcePath;
                  // const metaJobExecutionId = res.body.metaJobExecutionId;
                  // const date = res.body.createDate;

                  SettingsJobProfile.getJobProfilesViaApi({ query: `name="${profileName}"` }).then(
                    ({ jobProfiles }) => {
                      processFile(
                        uploadDefinition.id,
                        uploadDefinition,
                        // metaJobExecutionId,
                        // sourcePath,
                        // jobExecutionId,
                        // uiKeyValue,
                        jobProfiles[0].id,
                        // createDate,
                        // fileName,
                        jobProfiles[0].name,
                      );
                    },
                  );

                  // return cy.okapiRequest({
                  //   path: 'metadata-provider/jobExecutions',
                  //   qs: {
                  //     subordinationTypeNotAny: ['COMPOSITE_CHILD', 'PARENT_SINGLE'],
                  //     sortBy: 'started_date,desc',
                  //   },
                  //   searchParams: { limit: 10000 },
                  //   isDefaultSearchParamsRequired: false,
                  // }).then((re2) => {
                  //   const parts = sourcePath.split('-');
                  //   console.log(parts[2]);

                  //   const parentJobExecution = re2.body.jobExecutions.find(exec => exec.sourcePath === parts[2]);
                  //   console.log(parentJobExecution);
                  //   const parentJobExecutionId = parentJobExecution.id;
                  //   console.log(parentJobExecutionId);

                  // return cy.okapiRequest({
                  //   path: `metadata-provider/jobExecutions/${parentJobExecutionId}/children`,
                  //   isDefaultSearchParamsRequired: false,
                  // }).then((re4) => {
                  //   console.log(re4);
                  //   // const childJobExecutionIds = re4.body.jobExecutions[*].id
                  // });
                  // });
                });
              });
            });
          });
        });
    });
  },
};
