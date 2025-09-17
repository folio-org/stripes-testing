import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
let instanceTypeId;
let exportedFileName;
const nameForCSVFile = `AT_C10967_file_${getRandomPostfix()}.csv`;
const instance = {
  title: `AT_C10967_FolioInstance_${getRandomPostfix()}`,
  id: '',
  hrid: '',
  publication: [
    {
      publisher: 'Test Publisher',
      place: 'Test Place',
      dateOfPublication: '2023',
    },
  ],
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

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instance.title,
              publication: instance.publication,
            },
          }).then((createdInstanceData) => {
            instance.id = createdInstanceData.instanceId;

            cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
              instance.hrid = instanceData.hrid;
            });

            FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, instance.id);
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
      InventoryInstance.deleteInstanceViaApi(instance.id);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C10967 Verify Publication data mapping (firebird)',
      { tags: ['extendedPath', 'firebird', 'C10967'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with UUIDs of inventory instances
        ExportFile.uploadFile(nameForCSVFile);

        // Step 2: Run the "Default instances export job profile" by clicking on it > Specify "Instances" type > Click on "Run" button
        ExportFile.exportWithDefaultJobProfile(nameForCSVFile, 'Default instances', 'Instances');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${nameForCSVFile.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            1,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 3-4: Download the recently created file with extension .mrc by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5: Check that publication data is being correctly mapped according to the mapping rules
          const assertionsOnMarcFileContent = [
            {
              uuid: instance.id,
              assertions: [
                (record) => {
                  const publicationField = record.get('264')[0];

                  expect(publicationField.ind1).to.eq(' ');
                  expect(publicationField.ind2).to.eq('1');
                  expect(publicationField.subf[0][0]).to.eq('a');
                  expect(publicationField.subf[0][1]).to.eq(instance.publication[0].place);
                  expect(publicationField.subf[1][0]).to.eq('b');
                  expect(publicationField.subf[1][1]).to.eq(instance.publication[0].publisher);
                  expect(publicationField.subf[2][0]).to.eq('c');
                  expect(publicationField.subf[2][1]).to.eq(
                    instance.publication[0].dateOfPublication,
                  );
                },
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
