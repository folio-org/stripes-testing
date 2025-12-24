import permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let instanceTypeId;
const numberOfInstances = 10;
const fileName = `autoTestFile${getRandomPostfix()}.csv`;
const instances = [...Array(numberOfInstances)].map(() => ({
  title: `AT_C9288_FolioInstance_${getRandomPostfix()}`,
}));

describe('Data Export', () => {
  describe('Export to MARC', () => {
    beforeEach('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;

          instances.forEach((instance) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instance.title,
              },
            }).then((createdInstanceData) => {
              instance.uuid = createdInstanceData.instanceId;

              FileManager.appendFile(`cypress/fixtures/${fileName}`, `${instance.uuid}\n`);
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

    after('delete test data', () => {
      cy.getAdminToken();

      instances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.uuid);
      });

      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    });

    it(
      'C9288 Export small number of instance records - default instance mapping profile (firebird)',
      { tags: ['smoke', 'firebird', 'C9288'] },
      () => {
        ExportFileHelper.uploadFile(fileName);
        ExportFileHelper.exportWithDefaultJobProfile(fileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const resultFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;
          const recordsCount = numberOfInstances;

          DataExportResults.verifySuccessExportResultCells(
            resultFileName,
            recordsCount,
            jobId,
            user.username,
          );
        });
      },
    );
  });
});
