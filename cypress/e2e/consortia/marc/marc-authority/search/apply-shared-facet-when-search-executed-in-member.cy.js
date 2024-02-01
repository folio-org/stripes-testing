import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { JOB_STATUS_NAMES, MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const marcFiles = [
        {
          marc: 'marcAuthFileForC404421Central.mrc',
          fileName: `C404421 Central testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          tenant: tenantNames.central,
        },
        {
          marc: 'marcAuthFileForC404421LocalMember1.mrc',
          fileName: `C404421 Local testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          tenant: tenantNames.college,
        },
        {
          marc: 'marcAuthFileForC404421LocalMember2.mrc',
          fileName: `C404421 Local testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          tenant: tenantNames.university,
        },
      ];
      const createdAuthorityID = [];
      const searchResultsData = [
        ['Authorized', 'C404421 MARC authority 1st record from Central tenant', 'Genre'],
        [
          'Authorized',
          'C404421 MARC authority 2nd record from Member 1 tenant title',
          'Personal Name',
        ],
      ];

      const users = {};

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((userProperties) => {
            users.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
          })
          .then(() => {
            cy.loginAsAdmin({
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          })
          .then(() => {
            marcFiles.forEach((marcFile) => {
              if (marcFile.tenant === tenantNames.college) {
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, marcFile.tenant);
                DataImport.waitLoading();
                ConsortiumManager.checkCurrentTenantInTopMenu(marcFile.tenant);
              }
              if (marcFile.tenant === tenantNames.university) {
                ConsortiumManager.switchActiveAffiliation(tenantNames.college, marcFile.tenant);
                DataImport.waitLoading();
                ConsortiumManager.checkCurrentTenantInTopMenu(marcFile.tenant);
              }

              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              JobProfiles.waitFileIsImported(marcFile.fileName);
              Logs.checkJobStatus(marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(marcFile.fileName);
              Logs.getCreatedItemsID().then((link) => {
                createdAuthorityID.push(link.split('/')[5]);
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityID[0]);
        cy.setTenant(Affiliations.College);
        MarcAuthority.deleteViaAPI(createdAuthorityID[1]);
        cy.setTenant(Affiliations.University);
        MarcAuthority.deleteViaAPI(createdAuthorityID[2]);
      });

      it(
        'C404421 Apply "Shared" facet to the search result list in "Member" tenant when search was executed (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          MarcAuthorities.verifyExistanceOfSharedAccordion();
          MarcAuthorities.verifySharedAccordionOpen(false);

          MarcAuthorities.clickAccordionByName('Shared');
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'Yes', false);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'No', false);

          MarcAuthorities.searchBy('Keyword', 'C404421 MARC authority');
          searchResultsData.forEach((result) => {
            MarcAuthorities.verifyResultsRowContent(result[1], result[0], result[2]);
          });
          MarcAuthorities.checkRowsCount(searchResultsData.length);
          MarcAuthorities.verifySharedIcon(1);
          MarcAuthorities.verifySharedIconAbsent(0);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'Yes', 1);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'No', 1);

          MarcAuthoritiesSearch.selectAuthorityByIndex(1);
          MarcAuthority.verifySharedAuthorityDetailsHeading(
            'C404421 MARC authority 1st record from Central tenant',
          );

          MarcAuthorities.actionsSelectCheckbox('No');
          MarcAuthorities.verifyResultsRowContent(
            searchResultsData[1][1],
            searchResultsData[1][0],
            searchResultsData[1][2],
          );
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.verifySharedIconAbsent(0);
          MarcAuthority.verifyLocalAuthorityDetailsHeading(
            'C404421 MARC authority 2nd record from Member 1 tenant title',
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'Yes', false);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'No', true);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'Yes', 1);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'No', 1);

          MarcAuthorities.actionsSelectCheckbox('No');
          searchResultsData.forEach((result) => {
            MarcAuthorities.verifyResultsRowContent(result[1], result[0], result[2]);
          });
          MarcAuthorities.checkRowsCount(searchResultsData.length);
          MarcAuthorities.verifySharedIcon(1);
          MarcAuthorities.verifySharedIconAbsent(0);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'Yes', 1);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'No', 1);

          MarcAuthority.verifyLocalAuthorityDetailsHeading(
            'C404421 MARC authority 2nd record from Member 1 tenant title',
          );

          MarcAuthorities.actionsSelectCheckbox('Yes');
          MarcAuthorities.verifyResultsRowContent(
            searchResultsData[0][1],
            searchResultsData[0][0],
            searchResultsData[0][2],
          );
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.verifySharedIcon(0);
          MarcAuthority.verifySharedAuthorityDetailsHeading(
            'C404421 MARC authority 1st record from Central tenant',
          );

          MarcAuthorities.verifyFilterOptionCount('Shared', 'Yes', 1);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'No', 1);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'Yes', true);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'No', false);

          MarcAuthorities.actionsSelectCheckbox('Yes');
          searchResultsData.forEach((result) => {
            MarcAuthorities.verifyResultsRowContent(result[1], result[0], result[2]);
          });
          MarcAuthorities.checkRowsCount(searchResultsData.length);
          MarcAuthorities.verifySharedIcon(1);
          MarcAuthorities.verifySharedIconAbsent(0);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'Yes', 1);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'No', 1);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'Yes', false);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'No', false);

          MarcAuthorities.actionsSelectCheckbox('Yes');
          MarcAuthorities.actionsSelectCheckbox('No');

          searchResultsData.forEach((result) => {
            MarcAuthorities.verifyResultsRowContent(result[1], result[0], result[2]);
          });
          MarcAuthorities.checkRowsCount(searchResultsData.length);
          MarcAuthorities.verifySharedIcon(1);
          MarcAuthorities.verifySharedIconAbsent(0);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'Yes', true);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'No', true);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'Yes', 1);
          MarcAuthorities.verifyFilterOptionCount('Shared', 'No', 1);

          MarcAuthorities.selectSearchOptionInDropdown(MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE);
          MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE);

          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifyResultsRowContent(
            searchResultsData[1][1],
            searchResultsData[1][0],
            searchResultsData[1][2],
          );
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.verifySharedIconAbsent(0);
          MarcAuthorities.verifyCheckboxInAccordion('Shared', 'No', true);
        },
      );
    });
  });
});
