/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceNoteTypes from '../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let exportedFileName;
const csvFileName = `AT_C350408_instanceUUIDs_${getRandomPostfix()}.csv`;
const testData = {
  instanceTitle: `AT_C350408_FolioInstance_${getRandomPostfix()}`,
  instanceId: '',
  instanceHrid: '',
  notes: [
    {
      note: 'Test note NOT marked as Staff only',
      instanceNoteTypeId: '',
      staffOnly: false,
    },
  ],
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

          // Get instance note types - use General note type (always available by default)
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            limit: 1,
            query: 'name=="General note"',
          }).then((response) => {
            const generalNoteType = response.instanceNoteTypes[0];

            // Use the General note type for the single note
            testData.notes[0].instanceNoteTypeId = generalNoteType.id;

            // Create Folio instance with notes that are NOT marked as "Staff only"
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: testData.instanceTitle,
                notes: testData.notes,
              },
            }).then((createdInstanceData) => {
              testData.instanceId = createdInstanceData.instanceId;

              cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                testData.instanceHrid = instanceData.hrid;
              });

              FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
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
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C350408 Verify NOTEs types that are NOT marked as "StaffOnly" (firebird)',
      { tags: ['criticalPath', 'firebird', 'C350408'] },
      () => {
        // Step 1: Go to the "Data Export" app (already logged in from before block)
        DataExportLogs.verifyDragAndDropAreaExists();
        DataExportLogs.verifyUploadFileButtonDisabled(false);
        DataExportLogs.verifyRunningAccordionExpanded();

        // Step 2: Trigger the data export by clicking on the "or choose file" button and submitting .csv file
        ExportFile.uploadFile(csvFileName);

        // Step 3: Run the "Default instance export job profile" by clicking on it > Specify "Instance" type > Click on "Run" button
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

          // Step 4: Download the recently created file with extension .mrc by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5-6: Verify MARC field mappings for Notes that are NOT marked as "Staff only"
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instanceId,
              assertions: [
                (record) => {
                  const noteField = record.get('500')[0];

                  expect(noteField).to.exist;
                  expect(noteField.ind1).to.eq(' ');
                  expect(noteField.ind2).to.eq(' ');
                  expect(noteField.subf[0][0]).to.eq('a');
                  expect(noteField.subf[0][1]).to.eq(testData.notes[0].note);
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
