import permissions from '../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../support/constants';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../support/fragments/data-export/selectJobProfile';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';
import DateTools from '../../support/utils/dateTools';
import parseMrcFileContentAndVerify, {
  verify001FieldValue,
  verify005FieldValue,
  verify008FieldValue,
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
} from '../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let resultFileName;
const testInstances = [];
const instanceDetails = [];
const randomPostfix = getRandomPostfix();
const csvFileName = `C415268_instances_${randomPostfix}.csv`;
const recordsCount = 5;

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
      (userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;

            const instancePromises = [];

            for (let i = 0; i < 3; i++) {
              const marcTitle = `AT_C415268_MarcInstance_${randomPostfix}_${i}`;
              instancePromises.push(
                cy.createSimpleMarcBibViaAPI(marcTitle).then((instanceId) => {
                  testInstances.push(instanceId);
                  return cy.getInstanceById(instanceId).then((instanceData) => {
                    return cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
                      instanceDetails.push({
                        type: 'marc',
                        uuid: instanceId,
                        title: marcTitle,
                        hrid: instanceData.hrid,
                        srsId: srsRecords?.matchedId,
                      });
                    });
                  });
                }),
              );
            }

            for (let i = 0; i < 2; i++) {
              const folioTitle = `AT_C415268_FolioInstance_${randomPostfix}_${i}`;
              instancePromises.push(
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    title: folioTitle,
                    instanceTypeId,
                  },
                }).then((instanceData) => {
                  testInstances.push(instanceData.instanceId);
                  return cy.getInstanceById(instanceData.instanceId).then((fullInstanceData) => {
                    instanceDetails.push({
                      type: 'folio',
                      uuid: instanceData.instanceId,
                      title: folioTitle,
                      hrid: fullInstanceData.hrid,
                    });
                  });
                }),
              );
            }
          })
          .then(() => {
            const csvContent = testInstances.join('\n');

            FileManager.createFile(`cypress/fixtures/${csvFileName}`, csvContent);

            cy.login(user.username, user.password, {
              path: TopMenu.dataExportPath,
              waiter: DataExportLogs.waitLoading,
            });
          });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    testInstances.forEach((id) => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
    FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    FileManager.deleteFileFromDownloadsByMask(resultFileName);
  });

  it(
    'C415268 Verify Data export results made by User with "data - UI-Data-Export - edit" capability set (firebird)',
    { tags: ['extendedPath', 'firebird', 'C415268'] },
    () => {
      // Step 1: Verify available applications on the landing page
      TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.DATA_EXPORT, true);
      TopMenuNavigation.verifyNavigationItemAbsentOnTheBar(APPLICATION_NAMES.SETTINGS);

      // Step 2: Go to the "Data export" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
      DataExportLogs.waitLoading();
      DataExportLogs.verifyDragAndDropAreaExists();
      DataExportLogs.verifyUploadFileButtonDisabled(false);
      DataExportLogs.verifyViewAllLogsButtonEnabled();

      // Step 3: Trigger the data export by uploading CSV file
      cy.intercept('GET', '/data-export/job-profiles*').as('getJobProfiles');
      cy.intercept('POST', '/data-export/file-definitions').as('createFileDefinition');
      cy.intercept('POST', '/data-export/file-definitions/*/upload').as('uploadFile');
      cy.intercept('POST', '/data-export/export').as('startExport');
      cy.intercept('GET', '/data-export/job-executions?query=status=*').as('checkJobStatus');

      ExportFile.uploadFile(csvFileName);
      SelectJobProfile.verifySelectJobPane();
      SelectJobProfile.verifyExistingJobProfiles();
      SelectJobProfile.verifySearchBox();
      SelectJobProfile.verifySearchButton(true);

      cy.wait('@getJobProfiles').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
      });

      // Step 4: Run the "Default instances export job profile"
      ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

      // Step 5: Verify network statuses and job completion
      cy.wait('@createFileDefinition').then((interception) => {
        expect(interception.response.statusCode).to.be.oneOf([200, 201]);
      });
      cy.wait('@uploadFile').then((interception) => {
        expect(interception.response.statusCode).to.be.oneOf([200, 204]);
      });
      cy.wait('@startExport').then((interception) => {
        expect(interception.response.statusCode).to.be.oneOf([200, 201, 204]);
      });
      cy.wait('@checkJobStatus', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
        const jobId = jobData.hrId;
        const totalRecordsCount = testInstances.length;
        resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

        DataExportResults.verifySuccessExportResultCells(
          resultFileName,
          totalRecordsCount,
          jobId,
          user.username,
          'Default instances',
        );
        cy.getUserToken(user.username, user.password);

        // Step 6: Download the recently created file with extension .mrc
        DataExportLogs.clickButtonWithText(resultFileName);

        // Step 7: Verify the downloaded .mrc file is well formatted and contains all selected records
        const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();
        const marcInstanceAssertions = (instance) => [
          (record) => verify001FieldValue(record, instance.hrid),
          (record) => verify005FieldValue(record),
          (record) => verify008FieldValue(record, `${todayDateYYMMDD}                                  `),
          (record) => {
            verifyMarcFieldByTag(record, '245', {
              ind1: ' ',
              ind2: ' ',
              subfields: ['a', instance.title],
            });
          },
          (record) => {
            verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '999', {
              ind1: 'f',
              ind2: 'f',
              subfields: [
                ['i', instance.uuid],
                ['s', instance.srsId],
              ],
            });
          },
        ];

        const folioInstanceAssertions = (instance) => [
          (record) => verify001FieldValue(record, instance.hrid),
          (record) => verify005FieldValue(record),
          (record) => verify008FieldValue(record, `${todayDateYYMMDD}|||||||||||||||||       |||||und||`),
          (record) => {
            verifyMarcFieldByTag(record, '245', {
              ind1: '0',
              ind2: '0',
              subfields: ['a', instance.title],
            });
          },
          (record) => {
            verifyMarcFieldByTag(record, '999', {
              ind1: 'f',
              ind2: 'f',
              subfields: ['i', instance.uuid],
            });
          },
        ];

        const recordsToVerify = instanceDetails.map((instance) => ({
          uuid: instance.uuid,
          assertions:
            instance.type === 'marc'
              ? marcInstanceAssertions(instance)
              : folioInstanceAssertions(instance),
        }));

        parseMrcFileContentAndVerify(resultFileName, recordsToVerify, recordsCount);
      });
    },
  );
});
