import { APPLICATION_NAMES, MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';
import { getLongDelay } from '../../../../../support/utils/cypressTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataExportLogs from '../../../../../support/fragments/data-export/dataExportLogs';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const naturalId = `466307${randomNDigitNumber(15)}`;
      const testData = {
        authorityFields: [
          {
            tag: '100',
            content: `$a AT_C466307_MarcAuthority_${randomPostfix}`,
            indicators: ['1', '\\'],
          },
        ],
        authorityHeading: `AT_C466307_MarcAuthority_${randomPostfix}`,
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
        expectedActions: ['Export (MARC)', 'Print'],
      };

      // User is created directly in the Member tenant - that becomes their primary affiliation,
      // so login goes straight there and no UI affiliation switch is needed
      const memberTenantPermissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ];

      let user;
      let createdRecordId;
      let exportedMarcFile;
      const csvFileName = `AT_C466307_quickExportCSV_${randomPostfix}.csv`;

      before('Create user and test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Shared record - created directly in Central
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C466307_');
        MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, testData.authorityFields).then(
          (recordId) => {
            createdRecordId = recordId;
          },
        );

        cy.setTenant(Affiliations.College);
        cy.createTempUser(memberTenantPermissions).then((userProperties) => {
          user = userProperties;

          // Central affiliation is automatic - just assign the Central-side permission per
          // the precondition (the test itself never acts in Central, only sets it up here)
          cy.resetTenant();
          cy.assignPermissionsToExistingUser(user.userId, [
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]);

          cy.setTenant(Affiliations.College);
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        if (createdRecordId) MarcAuthority.deleteViaAPI(createdRecordId, true);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*');
        FileManager.deleteFileFromDownloadsByMask(exportedMarcFile);
      });

      it(
        'C466307 Download shared "MARC authority" record exported from authority detail view opened in the browse pane of Member tenant (consortia) (promin)',
        { tags: ['extendedPathECS', 'promin', 'C466307'] },
        () => {
          // Steps 1-2: Browse for the shared record, open its detail view
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(testData.browseOption, testData.authorityHeading);
          MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          // Step 3: Actions menu shows "Export (MARC)" and "Print"
          MarcAuthority.checkActionDropdownContent(testData.expectedActions);

          // Step 4: Export (MARC) - toast notification, .csv downloaded with the record's UUID
          cy.intercept('/data-export/quick-export').as('quickExport');
          MarcAuthority.clickExportMarcOption();
          MarcAuthorities.verifyToastNotificationAfterExportAuthority();
          cy.wait('@quickExport', getLongDelay()).then(({ response }) => {
            const jobHrId = response.body.jobExecutionHrId;
            exportedMarcFile = `quick-export-${jobHrId}.mrc`;

            ExportFile.downloadCSVFile(csvFileName, 'QuickAuthorityExport*');
            FileManager.readFile(`cypress/fixtures/${csvFileName}`).then((fileContent) => {
              const cleanContent = fileContent.trim().replace(/^"|"$/g, '');
              expect(cleanContent).to.equal(createdRecordId);
            });

            // Steps 5-7: Data export app - download and verify the exported .mrc file
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
            DataExportLogs.clickButtonWithText(exportedMarcFile);
            ExportFile.verifyFileIncludes(exportedMarcFile, [testData.authorityHeading]);
          });
        },
      );
    });
  });
});
