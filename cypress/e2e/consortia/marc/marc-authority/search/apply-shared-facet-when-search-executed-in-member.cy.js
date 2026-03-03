import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C404421');
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((userProperties) => {
            users.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C404421');
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
            cy.setTenant(Affiliations.University);
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C404421');
            cy.wait(10_000);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            marcFiles.forEach((marcFile) => {
              if (marcFile.tenant === tenantNames.college) {
                cy.setTenant(Affiliations.College);
              } else if (marcFile.tenant === tenantNames.university) {
                cy.setTenant(Affiliations.University);
              }
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  marcFile.createdAuthorityID = record.authority.id;
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
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
        { tags: ['criticalPathECS', 'spitfire', 'C404421'] },
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
