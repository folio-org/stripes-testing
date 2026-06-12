import { APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting', () => {
      const randomPostfix = getRandomPostfix();
      const naturalId = `449390${randomNDigitNumber(19)}`;

      const testData = {
        tag100: '100',
        authHeading: `AT_C449390_MarcAuthority_${randomPostfix}`,
        authHeadingFirstUpdate: `AT_C449390_MarcAuthority_${randomPostfix} UPDATED`,
        authHeadingSecondUpdate: `AT_C449390_MarcAuthority_${randomPostfix} SUPERUPDATED`,
      };

      const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
      const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
      const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
      const fileNameMask = `${downloadedReportDate}*`;

      let authorityId;
      let userData;

      before('Create test data via API', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C449390_');

        cy.then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, [
            {
              tag: testData.tag100,
              content: `$a ${testData.authHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            authorityId = id;
          });
        }).then(() => {
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.exportManagerAll.gui,
          ]).then((userProperties) => {
            userData = userProperties;
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(authorityId, true);
        Users.deleteViaApi(userData.userId);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });

      it(
        'C449390 Correct User\'s name is displayed in "Updater" column of "MARC authority headings updates (CSV)" report for first and second update of "MARC authority" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C449390'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });

          // Step 3: Search for the authority record imported by admin
          MarcAuthorities.searchBeats(testData.authHeading);
          MarcAuthorities.selectAuthorityById(authorityId);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authHeading);

          // Step 4: Open edit pane
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Step 5-6: First update of $a in 100 field → Save & keep editing
          QuickMarcEditor.updateExistingField(
            testData.tag100,
            `$a ${testData.authHeadingFirstUpdate}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag100,
            `$a ${testData.authHeadingFirstUpdate}`,
          );
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkPaneheaderContains(testData.authHeadingFirstUpdate);
          QuickMarcEditor.waitLoading();

          // Step 7-8: Second update of $a in 100 field → Save & close
          QuickMarcEditor.updateExistingField(
            testData.tag100,
            `$a ${testData.authHeadingSecondUpdate}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag100,
            `$a ${testData.authHeadingSecondUpdate}`,
          );
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authHeadingSecondUpdate);

          // Steps 9-10: Generate report for today → tomorrow
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          cy.intercept('POST', '/data-export-spring/jobs').as('getJobId');
          MarcAuthorities.clickExportButton();
          cy.wait('@getJobId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);

            // Steps 11-13: Go to Export Manager and download the report
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);

            // Step 14: Verify CSV contains both update rows with correct user name in Updater column
            FileManager.verifyFile(
              MarcAuthorities.verifyMARCAuthorityFileName,
              fileNameMask,
              MarcAuthorities.verifyContentOfExportFile,
              [
                new RegExp(
                  `${testData.authHeading},${testData.authHeadingFirstUpdate}.*"${userData.lastName}, ${userData.firstName}"`,
                ),
                new RegExp(
                  `${testData.authHeadingFirstUpdate},${testData.authHeadingSecondUpdate}.*"${userData.lastName}, ${userData.firstName}"`,
                ),
              ],
            );
          });
        },
      );
    });
  });
});
