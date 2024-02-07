import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import { JOB_STATUS_NAMES, MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
// import DataImport from '../../../../../support/fragments/data_import/dataImport';
// import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
// import Logs from '../../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
// import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse', () => {
      const marcFiles = [
        {
          marc: 'marcAuthFileForC404449Central.mrc',
          fileName: `C404449 Central testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          tenant: tenantNames.central,
          affiliation: Affiliations.Consortia,
          numOfRecords: 2,
          createdRecordIDs: [],
        },
        {
          marc: 'marcAuthFileForC404449LocalMember1.mrc',
          fileName: `C404449 Local testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          tenant: tenantNames.college,
          affiliation: Affiliations.College,
          numOfRecords: 2,
          createdRecordIDs: [],
        },
        {
          marc: 'marcAuthFileForC404449LocalMember2.mrc',
          fileName: `C404449 Local testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          tenant: tenantNames.university,
          affiliation: Affiliations.University,
          numOfRecords: 2,
          createdRecordIDs: [],
        },
      ];
      const sharedAuthorityFromCentralTenant1 = {
        authRefType: 'Authorized',
        heading: 'C404449 MARC authority 1st record, from Central tenant',
        typeOfHeading: 'Personal Name',
      };
      const sharedAuthorityFromCentralTenant4 = {
        authRefType: 'Authorized',
        heading: 'C404449 MARC authority 4th record, from Central tenant',
        typeOfHeading: 'Personal Name',
      };
      const localAuthorityFromMember1Tenant2 = {
        authRefType: 'Authorized',
        heading: 'C404449 MARC authority 2nd record, from Member 1 tenant',
        typeOfHeading: 'Personal Name',
      };
      const localAuthorityFromMember1Tenant5 = {
        authRefType: 'Authorized',
        heading: 'C404449 MARC authority 5th record, from Member 1 tenant',
        typeOfHeading: 'Conference Name',
      };
      const Dropdowns = {
        SHARED: 'Shared',
        YES: 'Yes',
        NO: 'No',
      };
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
          // .then(() => {
          //   cy.loginAsAdmin({
          //     path: TopMenu.dataImportPath,
          //     waiter: DataImport.waitLoading,
          //   });
          // })
          // .then(() => {
          //   marcFiles.forEach((marcFile, index) => {
          //     if (marcFile.tenant !== tenantNames.central) {
          //       ConsortiumManager.switchActiveAffiliation(
          //         marcFiles[index - 1].tenant,
          //         marcFile.tenant,
          //       );
          //       DataImport.waitLoading();
          //       ConsortiumManager.checkCurrentTenantInTopMenu(marcFile.tenant);
          //     }

          //     DataImport.verifyUploadState();
          //     DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          //     JobProfiles.waitLoadingList();
          //     JobProfiles.search(marcFile.jobProfileToRun);
          //     JobProfiles.runImportFile();
          //     JobProfiles.waitFileIsImported(marcFile.fileName);
          //     Logs.checkJobStatus(marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);
          //     Logs.openFileDetails(marcFile.fileName);
          //     for (let i = 0; i < marcFile.numOfRecords; i++) {
          //       Logs.getCreatedItemsID(i).then((link) => {
          //         marcFile.createdRecordIDs.push(link.split('/')[5]);
          //       });
          //     }
          //   });
          // })
          .then(() => {
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
              MarcAuthorities.switchToBrowse();
              MarcAuthorities.selectSearchOptionInDropdown('Personal name');
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        marcFiles.forEach((marcFile) => {
          cy.setTenant(marcFile.affiliation);
          marcFile.createdRecordIDs.forEach((record) => {
            MarcAuthority.deleteViaAPI(record);
          });
        });
      });

      it(
        'C404449 Apply "Shared" facet to the browse result list in "Member" tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          let sharedRecordsCount;
          let localRecordsCount;

          // 1 Check the "Search & filter" pane.

          MarcAuthorities.verifyExistanceOfSharedAccordion();
          MarcAuthorities.verifySharedAccordionOpen(false);

          // 2 Click on the "Shared" accordion button.

          MarcAuthorities.clickAccordionByName(Dropdowns.SHARED);
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.checkRecordsCountExistsInSharedFacet();

          MarcAuthorities.getSharedRecordsCountInSharedFacet().then((count) => {
            sharedRecordsCount = count;
          });
          MarcAuthorities.getLocalRecordsCountInSharedFacet.then((count) => {
            localRecordsCount = count;
          });
          cy.log(sharedRecordsCount);
          cy.log(localRecordsCount);

          // 3 Execute browse which will return both (Shared and Local) "MARC authority" records created at precondition:

          // Input the search query in the search box: "C404449 MARC authority 1st record, from Central tenant"
          // Click on the "Search" button.

          MarcAuthorities.searchBeats(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityFromCentralTenant1.heading,
            sharedAuthorityFromCentralTenant1.authRefType,
            sharedAuthorityFromCentralTenant1.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityFromCentralTenant1.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant2.heading,
            localAuthorityFromMember1Tenant2.authRefType,
            localAuthorityFromMember1Tenant2.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant2.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);

          // 4 Check the "No" checkbox in expanded "Shared" accordion.

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorityBrowse.checkResultWithNoValue(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant2.heading,
            localAuthorityFromMember1Tenant2.authRefType,
            localAuthorityFromMember1Tenant2.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant2.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);

          // 5 Uncheck the "No" checkbox in expanded "Shared" accordion.

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityFromCentralTenant1.heading,
            sharedAuthorityFromCentralTenant1.authRefType,
            sharedAuthorityFromCentralTenant1.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityFromCentralTenant1.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant2.heading,
            localAuthorityFromMember1Tenant2.authRefType,
            localAuthorityFromMember1Tenant2.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant2.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);

          // 6 Check the "Yes" checkbox in expanded "Shared" accordion.

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityFromCentralTenant1.heading,
            sharedAuthorityFromCentralTenant1.authRefType,
            sharedAuthorityFromCentralTenant1.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityFromCentralTenant1.heading,
            true,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);

          // 7 Uncheck the "Yes" checkbox in expanded "Shared" accordion.

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityFromCentralTenant1.heading,
            sharedAuthorityFromCentralTenant1.authRefType,
            sharedAuthorityFromCentralTenant1.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityFromCentralTenant1.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant2.heading,
            localAuthorityFromMember1Tenant2.authRefType,
            localAuthorityFromMember1Tenant2.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant2.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);

          // 8 Check both checkboxes ("No" and "Yes") in expanded "Shared" accordion button

          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityFromCentralTenant1.heading,
            sharedAuthorityFromCentralTenant1.authRefType,
            sharedAuthorityFromCentralTenant1.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityFromCentralTenant1.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant2.heading,
            localAuthorityFromMember1Tenant2.authRefType,
            localAuthorityFromMember1Tenant2.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant2.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.checkPreviousAndNextPaginationButtonsShown();

          // 9 Click on any pagination button, ex.: "Next"
          MarcAuthorities.clickNextPagination();
          MarcAuthorities.checkRowAbsentByContent(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.getSharedRecordsCountInSharedFacet().then((sharedCount) => {
            cy.expect(sharedCount).to.equal(sharedRecordsCount);
          });
          MarcAuthorities.getResultsListByColumn().then((localCount) => {
            cy.expect(localCount).to.equal(localRecordsCount);
          });

          // 10 Click on the browse option dropdown placed at the "Search & filter" pane and select "Corporate/Conference name" search option.

          MarcAuthorities.selectSearchOptionInDropdown('Corporate/Conference name');
          MarcAuthorities.checkSelectOptionFieldContent('Corporate/Conference name');

          // 11 Click on the "Search" button.

          MarcAuthorities.searchButtonClick();
          MarcAuthorityBrowse.checkResultWithNoValue(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityFromCentralTenant4.heading,
            sharedAuthorityFromCentralTenant4.authRefType,
            sharedAuthorityFromCentralTenant4.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityFromCentralTenant4.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityFromMember1Tenant5.heading,
            localAuthorityFromMember1Tenant5.authRefType,
            localAuthorityFromMember1Tenant5.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityFromMember1Tenant5.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.getSharedRecordsCountInSharedFacet().then((sharedCount) => {
            cy.expect(sharedCount).to.not.equal(sharedRecordsCount);
          });
          MarcAuthorities.getResultsListByColumn().then((localCount) => {
            cy.expect(localCount).to.not.equal(localRecordsCount);
          });

          // 12 Click on the "Type of heading" accordiong button and select "Corporate name" in multi select element.
          // add this step when bug will be fixed https://folio-org.atlassian.net/browse/UISAUTCOMP-108

          // 13 Click on the "Reset all" button

          MarcAuthorities.checkDefaultBrowseOptions(sharedAuthorityFromCentralTenant1.heading);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.checkTypeOfHeadingFacetCleared();
          MarcAuthorities.checkRecordsResultListIsAbsent();
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
        },
      );
    });
  });
});
