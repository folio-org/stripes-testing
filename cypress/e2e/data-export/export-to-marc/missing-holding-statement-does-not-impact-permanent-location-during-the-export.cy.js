/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
const randomPostfix = getRandomPostfix();
const csvFileName = `AT_C345416_instance_${randomPostfix}.csv`;
const jobProfileName = `AT_C345416_JobProfile_${randomPostfix} export job profile`;
const customMappingProfileName = `AT_C345416_CustomMappingProfile_${randomPostfix}`;
const mappingProfileBody = {
  name: customMappingProfileName,
  transformations: [
    {
      fieldId: 'holdings.holdingsstatements.statement',
      path: '$.holdings[*].holdingsStatements[*].statement',
      recordType: 'HOLDINGS',
      transformation: '866 0$a',
      enabled: true,
    },
    {
      fieldId: 'holdings.permanentlocation.name',
      path: '$.holdings[*].permanentLocationId',
      recordType: 'HOLDINGS',
      transformation: '866  $z',
      enabled: true,
    },
  ],
  recordTypes: ['SRS', 'HOLDINGS'],
  outputFormat: 'MARC',
  suppress999ff: false,
};
const folioInstance = {
  title: `AT_C345416_FolioInstance_${randomPostfix}`,
};
const testData = {};

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((types) => {
            testData.instanceTypeId = types[0].id;
          })
          .then(() => {
            cy.getLocations({ limit: 1 }).then((loc) => {
              testData.locationId = loc.id;
              testData.locationName = loc.name;
            });
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              testData.holdingTypeId = holdingTypes[0].id;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: folioInstance.title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                },
              ],
            }).then((createdInstanceData) => {
              folioInstance.uuid = createdInstanceData.instanceId;

              cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                folioInstance.hrid = instanceData.hrid;
              });
            });
          })
          .then(() => {
            cy.createDataExportCustomMappingProfile(mappingProfileBody).then((resp) => {
              testData.mappingProfileId = resp.id;

              ExportNewJobProfile.createNewJobProfileViaApi(
                jobProfileName,
                testData.mappingProfileId,
              ).then((jobResp) => {
                testData.jobProfileId = jobResp.body.id;
              });
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${csvFileName}`, folioInstance.uuid);
          });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.uuid);
      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.resultFileName);
    });

    it(
      'C345416 Missing holding statement does not impact permanent location during the export (firebird)',
      { tags: ['extendedPath', 'firebird', 'C345416'] },
      () => {
        // Step 1: Upload CSV with instance UUID
        ExportFileHelper.uploadFile(csvFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run job profile linked to mapping profile
        ExportFileHelper.exportWithCreatedJobProfile(csvFileName, jobProfileName);

        // Step 3: Wait for completion and verify log row
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = 1;
          testData.resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            testData.resultFileName,
            totalRecordsCount,
            jobId,
            user.username,
            `AT_C345416_JobProfile_${randomPostfix}`,
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Download resulting .mrc file
          DataExportLogs.clickButtonWithText(testData.resultFileName);

          // Step 5: Verify permanent location exported despite missing holdings statement
          const assertionsOnMarcFileContent = [
            {
              uuid: folioInstance.uuid,
              assertions: [
                (record) => expect(record.get('001')[0].value).to.eq(folioInstance.hrid),
                (record) => {
                  const field866 = record.fields.find((f) => f[0] === '866');
                  expect(field866).to.deep.eq(['866', '  ', 'z', testData.locationName]);
                },
                (record) => {
                  const field999 = record.fields.find((f) => f[0] === '999');
                  expect(field999).to.deep.eq(['999', 'ff', 'i', folioInstance.uuid]);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            testData.resultFileName,
            assertionsOnMarcFileContent,
            totalRecordsCount,
          );
        });
      },
    );
  });
});
