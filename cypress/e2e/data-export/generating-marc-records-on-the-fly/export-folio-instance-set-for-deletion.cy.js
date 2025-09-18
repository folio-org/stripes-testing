/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SetRecordForDeletionModal from '../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import DateTools from '../../../support/utils/dateTools';

let user;
let instanceTypeId;
let exportedFileName;
const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();
const folioInstanceTitle = `AT_C543846_FolioInstance_${randomFourDigitNumber()}`;
const createdInstanceIds = [];
const numberOfInstances = 2;
const fileName = `AT_C543846_autoTestFile${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    beforeEach('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          })
          .then(() => {
            for (let i = 1; i <= numberOfInstances; i++) {
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: `${folioInstanceTitle}_${i}`,
                },
              }).then((instanceId) => {
                createdInstanceIds.push(instanceId);
              });
            }
          })
          .then(() => {
            cy.getInstanceById(createdInstanceIds[0]).then((instanceData) => {
              instanceData.discoverySuppress = true;
              instanceData.staffSuppress = true;

              cy.updateInstance(instanceData);
            });
          })
          .then(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.searchInstanceByTitle(createdInstanceIds[1]);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyEditInstanceButtonIsEnabled();
            InstanceRecordView.setRecordForDeletion();
            SetRecordForDeletionModal.waitLoading();
            SetRecordForDeletionModal.clickConfirm();
            InstanceRecordView.verifyInstanceIsSetForDeletion();

            FileManager.createFile(`cypress/fixtures/${fileName}`, createdInstanceIds.join('\n'));

            cy.login(user.username, user.password, {
              path: TopMenu.dataExportPath,
              waiter: DataExportLogs.waitLoading,
              authRefresh: true,
            });
          });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();

      createdInstanceIds.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C543846 Verify export FOLIO Instance set for deletion (firebird)',
      { tags: ['criticalPath', 'firebird', 'C543846'] },
      () => {
        ExportFileHelper.uploadFile(fileName);
        ExportFileHelper.exportWithDefaultJobProfile(fileName, 'Default instances', 'Instances');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            numberOfInstances,
            jobId,
            user.username,
            'Default instances',
          );
          DataExportLogs.clickButtonWithText(exportedFileName);

          const commonAssertions = (instanceId) => [
            (record) => {
              expect(record.leader[5]).to.eq('d');
            },
            (record) => {
              expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
            },
            (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
            (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instanceId),
          ];
          const recordsToVerify = createdInstanceIds.map((id) => ({
            uuid: id,
            assertions: commonAssertions(id),
          }));

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, numberOfInstances);
        });
      },
    );
  });
});
