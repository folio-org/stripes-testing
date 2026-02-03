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
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        searchOption: 'Keyword',
        title: 'C378890 Marvel comics',
        updatedTitle: 'C378890 Marvel comics UPDATED',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC378890.mrc',
          fileName: `testMarcFileC378890.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC378890.mrc',
          fileName: `testMarcFileC378890.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityID = [];

      before('Creating user and uploading files', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C378890');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.exportManagerAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ])
          .then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;
          })
          .then(() => {
            cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
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
      });

      beforeEach('Login to the application', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdAuthorityID[0]);
        MarcAuthority.deleteViaAPI(createdAuthorityID[1], true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C378890 "MARC authority headings updates (CSV)" report includes correct "Authority source file name" when Authority source type "Not specified" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C378890'] },
        () => {
          // Link the bibliographic record to the authority record
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.searchByTitle(createdAuthorityID[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(22);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(testData.title);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          // Navigate to MARC Authority and edit the authority record
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.searchBy(testData.searchOption, testData.title);
          MarcAuthorities.selectTitle(testData.title);
          MarcAuthority.edit();
          // Waiter needed for the whole page to be loaded.
          cy.wait(2000);
          QuickMarcEditor.updateExistingField('130', `$a ${testData.updatedTitle}`);
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibs(1);

          // Generate and verify the report
          const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
          const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();
          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
            // Waiter needed for the job file to be downloaded.
            cy.wait(1000);
          });

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
              '130',
              'New 1XX',
              '130',
              'Authority source file name',
              'Not specified',
              'Number of bibliographic records linked',
              '1',
              'Updater',
              `"${testData.userProperties.username}, testPermFirst"`,
            ],
          );
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        },
      );
    });
  });
});
