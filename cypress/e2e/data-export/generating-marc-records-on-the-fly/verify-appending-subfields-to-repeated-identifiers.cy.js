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
const csvFileName = `AT_C350441_instanceUUIDs_${getRandomPostfix()}.csv`;
const identifierConfig = [
  { name: 'DOI', value: '10.1000/test456', subfieldValue: 'doi' },
  { name: 'Handle', value: '1234/test-handle', subfieldValue: 'hdl' },
];
const testData = {
  instanceTitle: `AT_C350441_FolioInstance_${getRandomPostfix()}`,
  instanceId: '',
  identifiers: identifierConfig.map((config) => ({
    identifierTypeId: '',
    value: config.value,
  })),
};

// Helper function to find field by identifier type
const findFieldByIdentifierType = (identifierFields, subfieldValue) => {
  return identifierFields.find((field) => {
    return field.subf[1][1] === subfieldValue;
  });
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

            // Set identifier type IDs using configuration
            identifierConfig.forEach((config, index) => {
              const identifierType = identifierTypes.find((type) => type.name === config.name);
              testData.identifiers[index].identifierTypeId = identifierType.id;
            });

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: testData.instanceTitle,
                identifiers: testData.identifiers,
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
      'C350441 Verify appending subfields to Identifiers if the record contains repeated "024 $a 7 " fields (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350441'] },
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

          // Steps 4-5: Verify identifier mappings to repeated field 024
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instanceId,
              assertions: [
                (record) => {
                  // Verify field 024 mappings for both DOI and Handle identifiers
                  const identifierFields = record.get('024');

                  expect(identifierFields).to.exist;
                  expect(identifierFields.length).to.eq(2);

                  // Verify each identifier mapping
                  identifierConfig.forEach(({ value, subfieldValue }) => {
                    const field = findFieldByIdentifierType(identifierFields, subfieldValue);

                    expect(field).to.exist;
                    expect(field.ind1).to.eq('7');
                    expect(field.ind2).to.eq(' ');
                    expect(field.subf[0][0]).to.eq('a');
                    expect(field.subf[0][1]).to.eq(value);
                    expect(field.subf[1][0]).to.eq('2');
                    expect(field.subf[1][1]).to.eq(subfieldValue);
                  });
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
