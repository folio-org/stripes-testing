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
const csvFileName = `AT_C430247_instanceUUIDs_${getRandomPostfix()}.csv`;
const testData = {
  instances: [
    {
      instanceTitle: `AT_C430247_FolioInstance_1_${getRandomPostfix()}`,
      instanceId: '',
      identifiers: [
        {
          identifierTypeId: '',
          value: 'OtherStandardId_123456789',
        },
      ],
    },
    {
      instanceTitle: `AT_C430247_FolioInstance_2_${getRandomPostfix()}`,
      instanceId: '',
      identifiers: [
        {
          identifierTypeId: '',
          value: 'OtherStandardId_111111111',
        },
        {
          identifierTypeId: '',
          value: 'OtherStandardId_222222222',
        },
      ],
    },
  ],
};

// Helper function to verify field mapping for Other Standard Identifier
const verifyOtherStandardIdentifierMapping = (record, expectedValues) => {
  const field024s = record.get('024');
  expect(field024s).to.exist;

  expectedValues.forEach((expectedValue) => {
    const matchingField = field024s.find((field) => {
      return field.subf.some((subf) => subf[0] === 'a' && subf[1] === expectedValue);
    });

    expect(matchingField).to.exist;
    expect(matchingField.ind1).to.eq('8');
    expect(matchingField.ind2).to.eq(' ');
  });
  expect(field024s.length).to.eq(expectedValues.length);
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
            const otherStandardIdentifierType = identifierTypes.find(
              (type) => type.name === 'Other standard identifier',
            );
            const instanceIds = [];

            // Create instances with Other Standard Identifiers
            testData.instances.forEach((instanceData) => {
              // Set identifier type for all identifiers in this instance
              instanceData.identifiers.forEach((identifier) => {
                identifier.identifierTypeId = otherStandardIdentifierType.id;
              });

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceData.instanceTitle,
                  identifiers: instanceData.identifiers,
                },
              }).then((createdInstanceData) => {
                instanceData.instanceId = createdInstanceData.instanceId;
                instanceIds.push(instanceData.instanceId);

                // Create CSV file after all instances are created
                if (instanceIds.length === testData.instances.length) {
                  const csvContent = instanceIds.join('\n');
                  FileManager.createFile(`cypress/fixtures/${csvFileName}`, csvContent);
                }
              });
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      testData.instances.forEach((instanceData) => {
        InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C430247 Verify appending subfields to Other Standard Identifier (firebird)',
      { tags: ['extendedPath', 'firebird', 'C430247'] },
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
            2,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 3: Download the recently created file by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Steps 4-5: Verify Other Standard Identifier mappings to MARC field 024
          const assertionsOnMarcFileContent = testData.instances.map((instanceData) => ({
            uuid: instanceData.instanceId,
            assertions: [
              (record) => {
                const expectedValues = instanceData.identifiers.map((id) => id.value);

                verifyOtherStandardIdentifierMapping(record, expectedValues);
              },
            ],
          }));

          parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 2);
        });
      },
    );
  });
});
