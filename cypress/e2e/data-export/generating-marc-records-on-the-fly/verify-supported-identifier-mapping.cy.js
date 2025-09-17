import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let exportedFileName;
const csvFileName = `AT_C10963_instanceUUIDs_${getRandomPostfix()}.csv`;
const identifierTestData = [
  { typeName: 'LCCN', value: 'lccn12345678', marcField: '010' },
  { typeName: 'ISBN', value: '9781234567890', marcField: '020' },
  { typeName: 'ISSN', value: '1234-5678', marcField: '022' },
  { typeName: 'System control number', value: 'system123456', marcField: '035' },
  { typeName: 'GPO item number', value: 'gpo12345', marcField: '074' },
];
const instance = {
  title: `AT_C10963_FolioInstance_${getRandomPostfix()}`,
  id: '',
  hrid: '',
  identifiers: identifierTestData.map((item) => ({
    identifierTypeId: '',
    value: item.value,
  })),
};

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;

          cy.getInstanceIdentifierTypes({ limit: 100 }).then(() => {
            const identifierTypes = Cypress.env('identifierTypes');

            identifierTestData.forEach((testItem, index) => {
              const identifierType = identifierTypes.find(
                (type) => type.name === testItem.typeName,
              );
              instance.identifiers[index].identifierTypeId = identifierType.id;
            });

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instance.title,
                identifiers: instance.identifiers,
              },
            }).then((createdInstanceData) => {
              instance.id = createdInstanceData.instanceId;

              cy.getInstanceById(instance.id).then((instanceData) => {
                instance.hrid = instanceData.hrid;
              });

              FileManager.createFile(`cypress/fixtures/${csvFileName}`, instance.id);
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
      InventoryInstance.deleteInstanceViaApi(instance.id);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C10963 Verify supported Identifier mapping (firebird)',
      { tags: ['extendedPath', 'firebird', 'C10963'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with UUIDs of inventory instances from Preconditions
        ExportFile.uploadFile(csvFileName);

        // Step 2: Run the "Default instances export job profile" by clicking on it > Specify "Instances" type > Click on "Run" button
        ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

        // Wait for job completion and verify export
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${csvFileName.replace('.csv', '')}-${jobId}.mrc`;

          // Verify export completed successfully
          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            1,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 3: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5: Check that the specific identifiers are being correctly mapped according to the mapping rules
          const assertionsOnMarcFileContent = [
            {
              uuid: instance.id,
              assertions: [
                (record) => {
                  expect(record.fields[0]).to.deep.eq(['001', instance.hrid]);
                },
                ...identifierTestData.flatMap((testItem) => [
                  (record) => expect(record.get(testItem.marcField)[0].ind1).to.eq(' '),
                  (record) => expect(record.get(testItem.marcField)[0].ind2).to.eq(' '),
                  (record) => expect(record.get(testItem.marcField)[0].subf[0][0]).to.eq('a'),
                  (record) => {
                    expect(record.get(testItem.marcField)[0].subf[0][1]).to.eq(testItem.value);
                  },
                ]),
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => {
                  expect(record.get('999')[0].subf[0][1]).to.eq(instance.id);
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
