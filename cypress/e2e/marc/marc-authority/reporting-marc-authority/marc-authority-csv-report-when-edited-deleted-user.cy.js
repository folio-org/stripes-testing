import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        searchOption: 'Keyword',
        title: 'C378894 Drama Genre',
        updatedTitle: 'C378894 Drama cinema Genre',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC378894.mrc',
          fileName: `testMarcFileC378894.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC378894.mrc',
          fileName: `testMarcFileC378894.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityID = [];
      let user1;
      let user2;

      before('Creating users and uploading files', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C378894*');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          user1 = createdUserProperties;
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.exportManagerAll.gui,
          Permissions.uiUsersCheckTransactions.gui,
          Permissions.uiUsersDelete.gui,
          Permissions.uiUserEdit.gui,
          Permissions.uiUsersView.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          user2 = createdUserProperties;
        });

        cy.then(() => {
          cy.getUserToken(user2.username, user2.password);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityID.push(record[marcFile.propertyName].id);
              });
            });
          });
        });

        cy.then(() => {
          cy.waitForAuthRefresh(() => {
            cy.login(user2.username, user2.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });

          InventoryInstances.searchByTitle(createdAuthorityID[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(51);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(testData.title);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.saveAndCloseWithValidationWarnings();
        });
      });

      after('Deleting remaining user and data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdAuthorityID[0]);
        MarcAuthority.deleteViaAPI(createdAuthorityID[1], true);
        Users.deleteViaApi(user2.userId);
      });

      it(
        'C378894 "MARC authority headings updates (CSV)" report generated when user who made updates was deleted (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C378894'] },
        () => {
          cy.login(user1.username, user1.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });

          MarcAuthorities.searchBy(testData.searchOption, testData.title);
          MarcAuthorities.waitLoading();
          MarcAuthority.edit();
          cy.wait(2000);

          QuickMarcEditor.updateExistingField('155', `$a ${testData.updatedTitle}`);
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibs(1);

          cy.login(user2.username, user2.password, {
            path: TopMenu.usersPath,
            waiter: Users.waitLoading,
            authRefresh: true,
          });
          UsersSearchPane.searchByUsername(user1.username);
          UsersSearchPane.selectUserFromList(user1.username);
          Users.deleteUser();
          Users.successMessageAfterDeletion(
            `User ${user1.username}, preferredName testMiddleName deleted successfully.`,
          );

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.clickActionsAndReportsButtons();

          const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
          const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();

          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
            cy.wait(1000);

            const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
            const fileNameMask = `${downloadedReportDate}*`;
            FileManager.verifyFile(
              MarcAuthorities.verifyMARCAuthorityFileName,
              fileNameMask,
              MarcAuthorities.verifyContentOfExportFile,
              [
                'Last updated',
                `${downloadedReportDate}`,
                'Original heading',
                testData.title,
                'New heading',
                testData.updatedTitle,
                'Original 1XX',
                '155',
                'New 1XX',
                '155',
                'Authority source file name',
                'LC Genre/Form Terms (LCGFT)',
                'Number of bibliographic records linked',
                '1',
                'Updater',
                'Unknown User',
              ],
            );
            FileManager.deleteFolder(Cypress.config('downloadsFolder'));
          });
        },
      );
    });
  });
});
