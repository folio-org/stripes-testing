/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let exportedFileName;
const csvFileName = `AT_C350440_instanceUUIDs_${getRandomPostfix()}.csv`;
const identifierConfig = {
  name: 'DOI',
  value: '10.1000/test123',
};
const testData = {
  instanceTitle: `AT_C350440_FolioInstance_${getRandomPostfix()}`,
  instanceId: '',
  identifier: {
    identifierTypeId: '',
    value: identifierConfig.value,
  },
};

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportViewAddUpdateProfiles.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;

          cy.getInstanceIdentifierTypes().then(() => {
            const identifierTypes = Cypress.env('identifierTypes');
            const identifierType = identifierTypes.find(
              (type) => type.name === identifierConfig.name,
            );
            testData.identifier.identifierTypeId = identifierType.id;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: testData.instanceTitle,
                identifiers: [testData.identifier],
              },
            }).then((createdInstanceData) => {
              testData.instanceId = createdInstanceData.instanceId;

              FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        cy.wait(5000);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C350440 Verify appending subfields to 1 any Identifier of DOI, Handle, URN (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350440'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with UUIDs of inventory instances
        ExportFile.uploadFile(csvFileName);

        // Step 2: Run the instance job profile by clicking on it
        ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${csvFileName.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            1,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 3: Download the recently created file by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Steps 4-5: Verify identifier mapping to field 024
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instanceId,
              assertions: [
                (record) => {
                  const identifierField = record.get('024')[0];

                  expect(identifierField).to.exist;
                  expect(identifierField.ind1).to.eq('7');
                  expect(identifierField.ind2).to.eq(' ');
                  expect(identifierField.subf[0][0]).to.eq('a');
                  expect(identifierField.subf[0][1]).to.eq(testData.identifier.value);
                  expect(identifierField.subf[1][0]).to.eq('2');
                  expect(identifierField.subf[1][1]).to.eq(identifierConfig.name.toLowerCase());
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 1);
        });
      },
    );
  });
});
