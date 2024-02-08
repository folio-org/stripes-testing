/* eslint-disable cypress/no-unnecessary-waiting */
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    const startedDate = new Date();
    const completedDate = startedDate;
    // format date as YYYY-MM-DD
    const formattedStart = DateTools.getFormattedDate({ date: startedDate });
    // api endpoint expects completedDate increased by 1 day
    completedDate.setDate(completedDate.getDate() + 1);
    const jobProfileId = '6eefa4c6-bbf7-4845-ad82-de7fc5abd0e3';

    const firstTestData = {
      instanceIds: [],
      marcFilePath: 'oneMarcBib.mrc',
      jobProfileName: 'Default - Create instance and SRS MARC Bib',
    };
    const secondTestData = {
      authorityIds: [],
      marcFilePath: 'oneMarcAuthority.mrc',
      jobProfileName: 'Default - Create SRS MARC Authority',
    };

    before(() => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        firstTestData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        // Log list should contain at least 30-35 import jobs, run by different users, and using different import profiles
        for (let i = 0; i < 15; i++) {
          const bibFileName = `C358136 autotestFileName${getRandomPostfix()}.mrc`;

          DataImport.uploadFileViaApi(
            firstTestData.marcFilePath,
            bibFileName,
            firstTestData.jobProfileName,
          ).then((response) => {
            firstTestData.instanceIds.push(response.relatedInstanceInfo.idList[0]);
          });
        }
        cy.logout();
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        secondTestData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        // Log list should contain at least 30-35 import jobs
        for (let i = 0; i < 15; i++) {
          const authFileName = `C358136 autotestFileName${getRandomPostfix()}.mrc`;

          DataImport.uploadFileViaApi(
            secondTestData.marcFilePath,
            authFileName,
            secondTestData.jobProfileName,
          ).then((response) => {
            secondTestData.authorityIds.push(response.relatedAuthorityInfo.idList[0]);
          });
        }
      });
    });

    after(() => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(firstTestData.user.userId);
        Users.deleteViaApi(secondTestData.user.userId);
        firstTestData.instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        secondTestData.authorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });
    });

    it(
      'C358136 A user can filter and delete import logs from the "View all" page (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.filterJobsByJobProfile(secondTestData.jobProfileName);
        LogsViewAll.filterJobsByDate({ from: formattedStart, end: formattedStart });

        const formattedEnd = DateTools.getFormattedDate({ date: completedDate });

        LogsViewAll.checkByDateAndJobProfile(
          { from: formattedStart, end: formattedEnd },
          jobProfileId,
        ).then((count) => {
          cy.wait(2000);
          LogsViewAll.selectAllLogs();
          LogsViewAll.checkIsLogsSelected(count);
          LogsViewAll.unmarcCheckbox(0);
          LogsViewAll.checkmarkAllLogsIsRemoved();
          LogsViewAll.deleteLog();

          const countOfLogsForDelete = count - 1;
          DeleteDataImportLogsModal.confirmDelete(countOfLogsForDelete);
          LogsViewAll.verifyMessageOfDeleted(countOfLogsForDelete);
          LogsViewAll.modalIsAbsent();
        });
      },
    );
  });
});
