import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  JOB_STATUS_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../../support/constants';
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
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: tenantNames.central,
          affiliation: Affiliations.Consortia,
        },
        {
          marc: 'marcAuthFileForC404421LocalMember1.mrc',
          fileName: `C404421 Local testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: tenantNames.college,
          affiliation: Affiliations.College,
        },
        {
          marc: 'marcAuthFileForC404421LocalMember2.mrc',
          fileName: `C404421 Local testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: tenantNames.university,
          affiliation: Affiliations.University,
        },
      ];
      const sharedAuthorityFromCentralTenant = {
        authRefType: 'Authorized',
        heading: 'C404421 MARC authority 1st record from Central tenant',
        typeOfHeading: 'Genre',
      };
      const localAuthorityFromMember1Tenant = {
        authRefType: 'Authorized',
        heading: 'C404421 MARC authority 2nd record from Member 1 tenant title',
        typeOfHeading: 'Personal Name',
      };
      const searchValue = 'C404421 MARC authority';
      const Dropdowns = {
        SHARED: 'Shared',
        YES: 'Yes',
        NO: 'No',
      };
      const users = {};

      function verifySharedAndLocalRecordsFoundCheckBoxesUnchecked() {
        MarcAuthorities.verifyResultsRowContent(
          localAuthorityFromMember1Tenant.heading,
          localAuthorityFromMember1Tenant.authRefType,
          localAuthorityFromMember1Tenant.typeOfHeading,
        );
        MarcAuthorities.verifyResultsRowContent(
          sharedAuthorityFromCentralTenant.heading,
          sharedAuthorityFromCentralTenant.authRefType,
          sharedAuthorityFromCentralTenant.typeOfHeading,
        );
        MarcAuthorities.checkRowsCount(2);
        MarcAuthorities.verifyResultRowContentSharedIcon(
          localAuthorityFromMember1Tenant.heading,
          false,
        );
        MarcAuthorities.verifyResultRowContentSharedIcon(
          sharedAuthorityFromCentralTenant.heading,
          true,
        );
        MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
        MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
        MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.YES, 1);
        MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.NO, 1);
      }

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
            marcFiles.forEach((marcFile, index) => {
              if (marcFile.tenant !== tenantNames.central) {
                ConsortiumManager.switchActiveAffiliation(
                  marcFiles[index - 1].tenant,
                  marcFile.tenant,
                );
                DataImport.waitLoading();
                ConsortiumManager.checkCurrentTenantInTopMenu(marcFile.tenant);
              }

              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              Logs.waitFileIsImported(marcFile.fileName);
              Logs.checkJobStatus(marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(marcFile.fileName);
              Logs.getCreatedItemsID().then((link) => {
                marcFile.createdAuthorityID = link.split('/')[5];
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
        marcFiles.forEach((marcFile) => {
          cy.setTenant(marcFile.affiliation);
          MarcAuthority.deleteViaAPI(marcFile.createdAuthorityID);
        });
      });

      it(
        'C404421 Apply "Shared" facet to the search result list in "Member" tenant when search was executed (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          MarcAuthorities.verifyExistanceOfSharedAccordion();
          MarcAuthorities.verifySharedAccordionOpen(false);

          MarcAuthorities.clickAccordionByName(Dropdowns.SHARED);
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);

          MarcAuthorities.searchBy('Keyword', searchValue);
          verifySharedAndLocalRecordsFoundCheckBoxesUnchecked();

          MarcAuthoritiesSearch.selectAuthorityByIndex(1);
          MarcAuthority.verifySharedAuthorityDetailsHeading(
            sharedAuthorityFromCentralTenant.heading,
          );

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant.heading,
            localAuthorityFromMember1Tenant.authRefType,
            localAuthorityFromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.checkRowsCount(1);

          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant.heading,
            false,
          );
          MarcAuthority.verifyLocalAuthorityDetailsHeading(localAuthorityFromMember1Tenant.heading);
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.YES, 1);
          MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.NO, 1);

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          verifySharedAndLocalRecordsFoundCheckBoxesUnchecked();

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityFromCentralTenant.heading,
            sharedAuthorityFromCentralTenant.authRefType,
            sharedAuthorityFromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.checkRowsCount(1);

          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityFromCentralTenant.heading,
            true,
          );
          MarcAuthority.verifySharedAuthorityDetailsHeading(
            sharedAuthorityFromCentralTenant.heading,
          );
          MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.YES, 1);
          MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.NO, 1);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          verifySharedAndLocalRecordsFoundCheckBoxesUnchecked();

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant.heading,
            localAuthorityFromMember1Tenant.authRefType,
            localAuthorityFromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityFromCentralTenant.heading,
            sharedAuthorityFromCentralTenant.authRefType,
            sharedAuthorityFromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.checkRowsCount(2);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityFromCentralTenant.heading,
            true,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant.heading,
            false,
          );
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.YES, 1);
          MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.NO, 1);

          MarcAuthorities.selectSearchOptionInDropdown(MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE);
          MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE);

          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant.heading,
            localAuthorityFromMember1Tenant.authRefType,
            localAuthorityFromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant.heading,
            false,
          );
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.NO, 1);
        },
      );
    });
  });
});
