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
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `377015${randomNDigitNumber(15)}`;

      const testData = {
        tag008: '008',
        tag100: '100',
        tag240: '240',
        tag245: '245',
        authorityNaturalId: `n${randomDigits}`,
        auth100Content: `$a AT_C377015_MarcAuthority_${randomPostfix}, $d 1770-1827`,
        auth100UpdatedContent: `$a AT_C377015_MarcAuthority_Updated_${randomPostfix}, $d 1770-1827`,
        bibTitle: `AT_C377015_MarcBibInstance_${randomPostfix}`,
        bib240InitialContent: `$a AT_C377015_MarcAuthority_${randomPostfix}, $d 1770-1827`,
      };

      const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
      const todayWithoutPaddingZero = DateTools.clearPaddingZero(today);
      const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
      const expectedJobValues = {
        status: 'Successful',
        jobType: 'MARC authority headings updates',
        description: 'List of updated MARC authority (1XX) headings',
        outputType: 'MARC authority headings updates (CSV)',
      };

      let userData;
      let authorityId;
      let bibId;

      before('Create test data via API', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C377015_');

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
              Permissions.exportManagerAll.gui,
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
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
      });

      it(
        'C377015 Correct data for "MARC authority headings updates (CSV)" report shown in "Export manager" (minimal permissions) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C377015'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });

          // Steps 1-4: Generate report with today → tomorrow date range
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();
          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            const jobID = item.response.body.name;
            const expectedJobData = [
              jobID,
              expectedJobValues.status,
              expectedJobValues.jobType,
              expectedJobValues.description,
              userData.username,
              todayWithoutPaddingZero,
            ];
            const expectedJobDetails = {
              jobID,
              status: expectedJobValues.status,
              jobType: expectedJobValues.jobType,
              outputType: expectedJobValues.outputType,
              description: expectedJobValues.description,
              source: userData.username,
              startDate: todayWithoutPaddingZero,
              endDate: todayWithoutPaddingZero,
            };

            MarcAuthorities.checkCalloutAfterExport(jobID);

            // Steps 5-7: Go to Export Manager, search by Authority control, verify job row
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.waitLoading();
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.verifyJobDataInResults(expectedJobData);

            // Step 8: Open job detail view and verify all fields
            ExportManagerSearchPane.openJobDetailView(jobID);
            ExportManagerSearchPane.verifyJobDataInDetailView(expectedJobDetails);
          });
        },
      );
    });
  });
});
