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
      const randomDigits = `375228${randomNDigitNumber(15)}`;

      const testData = {
        tag008: '008',
        tag100: '100',
        tag240: '240',
        tag245: '245',
        authorityNaturalId: `n${randomDigits}`,
        auth100Content: `$a AT_C375228_MarcAuthority_Beethoven_${randomPostfix} $t AT_C375228_MarcAuthority_Variations_${randomPostfix} $d 1770-1827`,
        auth100UpdatedContent: `$a AT_C375228_MarcAuthority_Beethoven_${randomPostfix} Updated $t AT_C375228_MarcAuthority_Variations_${randomPostfix} $d 1770-1827`,
        bibTitle: `AT_C375228_MarcBibInstance_${randomPostfix}`,
        bib240InitialContent: `$a AT_C375228_MarcAuthority_Variations_${randomPostfix} $d 1770-1827`,
      };

      // A future date
      const futureDate = DateTools.getTwoFutureDaysDateForFiscalYear();

      let userData;
      let authorityId;
      let bibId;

      before('Create test data via API', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375228_');

        cy.then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI('', testData.authorityNaturalId, [
            {
              tag: testData.tag100,
              content: testData.auth100Content,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            authorityId = id;
          });

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
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId,
              authorityIds: [authorityId],
              bibFieldTags: [testData.tag240],
              authorityFieldTags: [testData.tag100],
              finalBibFieldContents: [testData.bib240InitialContent],
            });
            MarcAuthorities.waitAuthorityLinked(authorityId, 1);
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
        MarcAuthority.deleteViaAPI(authorityId, true);
        InventoryInstance.deleteInstanceViaApi(bibId);
        Users.deleteViaApi(userData.userId);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });

      it(
        'C375228 Empty "MARC authority headings updates (CSV)" report is generated when record headings were not updated during chosen time range (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375228'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });

          // Steps 1-2: Search for the authority record and open detail view
          MarcAuthorities.searchBeats(testData.authorityNaturalId);
          MarcAuthorities.selectAuthorityById(authorityId);
          MarcAuthority.waitLoading();

          // Step 3: Click Actions > Edit
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          cy.wait(2000);

          // Step 4: Update $a of 100 field
          QuickMarcEditor.updateExistingField(testData.tag100, testData.auth100UpdatedContent);
          QuickMarcEditor.checkContentByTag(testData.tag100, testData.auth100UpdatedContent);

          // Step 5: Save & close → confirm "Are you sure?" modal
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibs(1);

          // Steps 6-9: Generate report for a date range BEFORE the update was made (no updates in range)
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(futureDate, futureDate);
          MarcAuthorities.clickExportButton();
          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);

            // Steps 10-11: Go to Export Manager, download the report
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
            cy.wait(1000);
          });

          // Step 12: Verify downloaded CSV has "No records found"
          const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
          const fileNameMask = `${downloadedReportDate}*`;
          FileManager.verifyFile(
            MarcAuthorities.verifyMARCAuthorityFileName,
            fileNameMask,
            MarcAuthorities.verifyContentOfExportFile,
            ['No records found'],
          );
        },
      );
    });
  });
});
