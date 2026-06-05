import { APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
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
      const randomDigits = `375233${randomNDigitNumber(15)}`;

      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag111: '111',
        tag240: '240',
        tag245: '245',

        // Authority 1 – controls bib 240 (100 field)
        auth1NaturalId: `n${randomDigits}1`,
        auth100Content: `$a AT_C375233_MarcAuthority_BeethovenA_${randomPostfix} $d 1770-1827`,
        auth100FirstUpdate: `$a AT_C375233_MarcAuthority_BeethovenB_${randomPostfix} $d 1770-1827`,
        auth100SecondUpdate: `$a AT_C375233_MarcAuthority_BeethovenC_${randomPostfix} $d 1770-1827`,

        // Authority 2 – does NOT control any bib (111 field)
        auth2NaturalId: `n${randomDigits}2`,
        auth111Content: `$a AT_C375233_MarcAuthority_Delaware_${randomPostfix}`,
        auth111Updated: `$a AT_C375233_MarcAuthority_Delaware_TEST_${randomPostfix}`,

        bibTitle: `AT_C375233_MarcBibInstance_${randomPostfix}`,
        bib240InitialContent: `$a AT_C375233_MarcAuthority_BeethovenA_${randomPostfix} $d 1770-1827`,
      };

      // Date range covering today's updates
      const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
      const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

      let userData;
      let auth1Id;
      let auth2Id;
      let bibId;

      before('Create test data via API', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375233_');

        cy.then(() => {
          // Authority 1: controlling record (100 field, with 010)
          MarcAuthorities.createMarcAuthorityViaAPI('', testData.auth1NaturalId, [
            {
              tag: testData.tag100,
              content: testData.auth100Content,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            auth1Id = id;
          });

          // Authority 2: non-controlling record (111 field, no 010)
          MarcAuthorities.createMarcAuthorityViaAPI('', testData.auth2NaturalId, [
            {
              tag: testData.tag111,
              content: testData.auth111Content,
              indicators: ['2', '\\'],
            },
          ]).then((id) => {
            auth2Id = id;
          });

          // Bib with 240 placeholder
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
            { tag: testData.tag008, content: QuickMarcEditor.valid008ValuesInstance },
            {
              tag: testData.tag245,
              content: `$a ${testData.bibTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: testData.tag240,
              content: '$a placeholder',
              indicators: ['1', '0'],
            },
          ]).then((instanceId) => {
            bibId = instanceId;
          });
        })
          .then(() => {
            // Link bib 240 → authority 1 (100)
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId,
              authorityIds: [auth1Id],
              bibFieldTags: [testData.tag240],
              authorityFieldTags: [testData.tag100],
              finalBibFieldContents: [testData.bib240InitialContent],
            });
            MarcAuthorities.waitAuthorityLinked(auth1Id, 1);
          })
          .then(() => {
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
        MarcAuthority.deleteViaAPI(auth1Id, true);
        MarcAuthority.deleteViaAPI(auth2Id, true);
        InventoryInstance.deleteInstanceViaApi(bibId);
        Users.deleteViaApi(userData.userId);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });

      it(
        'C375233 "MARC authority headings updates (CSV)" report includes data on several heading updates for the same "MARC authority" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C375233'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });

          // Steps 1-2: Search for controlling authority (auth1) and open detail view
          MarcAuthorities.searchBeats(testData.auth1NaturalId);
          MarcAuthorities.selectAuthorityById(auth1Id);
          MarcAuthority.waitLoading();

          // Step 3: Edit authority 1
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          cy.wait(2000);

          // Step 4: First update of $a in 100 field → Save & keep editing
          QuickMarcEditor.updateExistingField(testData.tag100, testData.auth100FirstUpdate);
          QuickMarcEditor.checkContentByTag(testData.tag100, testData.auth100FirstUpdate);
          QuickMarcEditor.saveAndKeepEditingUpdatedLinkedBibField();

          // Step 5: Confirm modal → stay in editor
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(testData.tag100, testData.auth100FirstUpdate);

          // Step 6: Second update of $a in 100 field → Save & close
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.auth100SecondUpdate);
          QuickMarcEditor.checkContentByTag(testData.tag100, testData.auth100SecondUpdate);
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();

          // Step 7: Confirm modal → editor closes
          QuickMarcEditor.confirmUpdateLinkedBibs(1);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.auth100SecondUpdate);

          // Steps 8-9: Search for non-controlling authority (auth2) and open detail view
          MarcAuthorities.searchBeats(testData.auth2NaturalId);
          MarcAuthorities.selectAuthorityById(auth2Id);
          MarcAuthority.waitLoading();

          // Step 10: Edit authority 2
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          cy.wait(2000);

          // Step 11: Update 111 field → Save & close (no linked bib modal)
          QuickMarcEditor.updateExistingField(testData.tag111, testData.auth111Updated);
          QuickMarcEditor.checkContentByTag(testData.tag111, testData.auth111Updated);
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.auth111Updated);

          // Steps 12-15: Generate report for today → tomorrow (covers both authority updates)
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();
          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);

            // Steps 16-17: Go to Export Manager, download the report
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
            cy.wait(1000);

            // Step 18: Verify CSV includes data for BOTH auth1 updates and does NOT include auth2 update
            const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
            const fileNameMask = `${downloadedReportDate}*`;

            // Positive check: first and second heading updates for auth1 are present
            FileManager.verifyFile(
              MarcAuthorities.verifyMARCAuthorityFileName,
              fileNameMask,
              MarcAuthorities.verifyContentOfExportFile,
              [
                'Last updated',
                `${downloadedReportDate}`,
                'Original heading',
                `AT_C375233_MarcAuthority_BeethovenA_${randomPostfix}`,
                'New heading',
                `AT_C375233_MarcAuthority_BeethovenB_${randomPostfix}`,
                `AT_C375233_MarcAuthority_BeethovenC_${randomPostfix}`,
                'Original 1XX',
                '100',
                'New 1XX',
                '100',
                'Updater',
                `"${userData.lastName}, ${userData.firstName}"`,
              ],
            );
          });
        },
      );
    });
  });
});
