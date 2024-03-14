import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { JOB_STATUS_NAMES, MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse', () => {
      let sharedRecordsCount;
      let localRecordsCount;
      const users = {};
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
      const sharedAuthorityRecord1FromCentralTenant = {
        authRefType: 'Authorized',
        heading: 'C404449 MARC authority 1st record, from Central tenant',
        typeOfHeading: 'Personal Name',
      };
      const sharedAuthorityRecord4FromCentralTenant = {
        authRefType: 'Authorized',
        heading: 'C404449 MARC authority 4th record, from Central tenant',
        typeOfHeading: 'Corporate Name',
      };
      const localAuthorityRecord2FromMember1Tenant = {
        authRefType: 'Authorized',
        heading: 'C404449 MARC authority 2nd record, from Member 1 tenant',
        typeOfHeading: 'Personal Name',
      };
      const localAuthorityRecord5FromMember1Tenant = {
        authRefType: 'Authorized',
        heading: 'C404449 MARC authority 5th record, from Member 1 tenant',
        typeOfHeading: 'Conference Name',
      };
      const Dropdowns = {
        SHARED: 'Shared',
        YES: 'Yes',
        NO: 'No',
      };

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
              JobProfiles.waitFileIsImported(marcFile.fileName);
              Logs.checkJobStatus(marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(marcFile.fileName);
              for (let i = 0; i < marcFile.numOfRecords; i++) {
                Logs.getCreatedItemsID(i).then((link) => {
                  marcFile.createdRecordIDs.push(link.split('/')[5]);
                });
              }
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
              MarcAuthorities.switchToBrowse();
              MarcAuthorities.selectSearchOptionInDropdown(
                MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
              );
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
          // 1 Check the "Search & filter" pane.
          MarcAuthorities.verifyExistanceOfSharedAccordion();
          MarcAuthorities.verifySharedAccordionOpen(false);

          // 2 Click on the "Shared" accordion button.
          MarcAuthorities.clickAccordionByName(Dropdowns.SHARED);
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.checkRecordsCountExistsInSharedFacet();

          // 3 Execute browse which will return both (Shared and Local) "MARC authority" records created at precondition:
          // Input the search query in the search box: "C404449 MARC authority 1st record, from Central tenant"
          // Click on the "Search" button.
          MarcAuthorities.searchBeats(sharedAuthorityRecord1FromCentralTenant.heading);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityRecord1FromCentralTenant.heading,
            sharedAuthorityRecord1FromCentralTenant.authRefType,
            sharedAuthorityRecord1FromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityRecord1FromCentralTenant.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityRecord1FromCentralTenant.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityRecord2FromMember1Tenant.heading,
            localAuthorityRecord2FromMember1Tenant.authRefType,
            localAuthorityRecord2FromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityRecord2FromMember1Tenant.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
            sharedRecordsCount = count;
          });
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
            localRecordsCount = count;
          });

          // 4 Check the "No" checkbox in expanded "Shared" accordion.
          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorityBrowse.checkResultWithNoValue(
            sharedAuthorityRecord1FromCentralTenant.heading,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityRecord2FromMember1Tenant.heading,
            localAuthorityRecord2FromMember1Tenant.authRefType,
            localAuthorityRecord2FromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityRecord2FromMember1Tenant.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);

          // 5 Uncheck the "No" checkbox in expanded "Shared" accordion.
          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityRecord1FromCentralTenant.heading,
            sharedAuthorityRecord1FromCentralTenant.authRefType,
            sharedAuthorityRecord1FromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityRecord1FromCentralTenant.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityRecord1FromCentralTenant.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityRecord2FromMember1Tenant.heading,
            localAuthorityRecord2FromMember1Tenant.authRefType,
            localAuthorityRecord2FromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityRecord2FromMember1Tenant.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
            cy.expect(count).to.eq(sharedRecordsCount);
          });
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
            cy.expect(count).to.eq(localRecordsCount);
          });

          // 6 Check the "Yes" checkbox in expanded "Shared" accordion.
          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityRecord1FromCentralTenant.heading,
            sharedAuthorityRecord1FromCentralTenant.authRefType,
            sharedAuthorityRecord1FromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityRecord1FromCentralTenant.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityRecord1FromCentralTenant.heading,
            true,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);

          // 7 Uncheck the "Yes" checkbox in expanded "Shared" accordion.
          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityRecord1FromCentralTenant.heading,
            sharedAuthorityRecord1FromCentralTenant.authRefType,
            sharedAuthorityRecord1FromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityRecord1FromCentralTenant.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityRecord1FromCentralTenant.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityRecord2FromMember1Tenant.heading,
            localAuthorityRecord2FromMember1Tenant.authRefType,
            localAuthorityRecord2FromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityRecord2FromMember1Tenant.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
            cy.expect(count).to.eq(sharedRecordsCount);
          });
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
            cy.expect(count).to.eq(localRecordsCount);
          });

          // 8 Check both checkboxes ("No" and "Yes") in expanded "Shared" accordion button
          MarcAuthorities.actionsSelectCheckbox(Dropdowns.YES);
          MarcAuthorities.actionsSelectCheckbox(Dropdowns.NO);
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityRecord1FromCentralTenant.heading,
            sharedAuthorityRecord1FromCentralTenant.authRefType,
            sharedAuthorityRecord1FromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.checkRecordInBold(sharedAuthorityRecord1FromCentralTenant.heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityRecord1FromCentralTenant.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityRecord2FromMember1Tenant.heading,
            localAuthorityRecord2FromMember1Tenant.authRefType,
            localAuthorityRecord2FromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityRecord2FromMember1Tenant.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.checkPreviousAndNextPaginationButtonsShown();

          // 9 Click on any pagination button, ex.: "Next"
          MarcAuthorities.clickNextPagination();
          MarcAuthorities.checkRowAbsentByContent(sharedAuthorityRecord1FromCentralTenant.heading);
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
            cy.expect(count).to.eq(sharedRecordsCount);
          });
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
            cy.expect(count).to.eq(localRecordsCount);
          });

          // 10 Click on the browse option dropdown placed at the "Search & filter" pane and select "Corporate/Conference name" search option.
          MarcAuthorities.selectSearchOptionInDropdown(
            MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
          );
          MarcAuthorities.checkSelectOptionFieldContent(
            MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
          );

          // 11 Click on the "Search" button.
          MarcAuthorities.searchButtonClick();
          MarcAuthorityBrowse.checkResultWithNoValue(
            sharedAuthorityRecord1FromCentralTenant.heading,
          );
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityRecord4FromCentralTenant.heading,
            sharedAuthorityRecord4FromCentralTenant.authRefType,
            sharedAuthorityRecord4FromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityRecord4FromCentralTenant.heading,
            true,
          );
          MarcAuthorities.verifyResultsRowContent(
            localAuthorityRecord5FromMember1Tenant.heading,
            localAuthorityRecord5FromMember1Tenant.authRefType,
            localAuthorityRecord5FromMember1Tenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            localAuthorityRecord5FromMember1Tenant.heading,
            false,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
            cy.expect(count).to.not.eq(sharedRecordsCount);

            sharedRecordsCount = count;
          });
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
            cy.expect(count).to.not.eq(localRecordsCount);

            localRecordsCount = count;
          });

          // 12 Click on the "Type of heading" accordiong button and select "Corporate Name" in multi select element.
          MarcAuthorities.chooseTypeOfHeading('Corporate Name');
          MarcAuthorityBrowse.checkResultWithNoValue(
            sharedAuthorityRecord1FromCentralTenant.heading,
          );
          MarcAuthorities.verifyResultsRowContent(
            sharedAuthorityRecord4FromCentralTenant.heading,
            sharedAuthorityRecord4FromCentralTenant.authRefType,
            sharedAuthorityRecord4FromCentralTenant.typeOfHeading,
          );
          MarcAuthorities.verifyResultRowContentSharedIcon(
            sharedAuthorityRecord4FromCentralTenant.heading,
            true,
          );
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
            cy.expect(count).to.not.eq(sharedRecordsCount);

            sharedRecordsCount = count;
          });
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
            cy.expect(count).to.not.eq(localRecordsCount);

            localRecordsCount = count;
          });

          // 13 Click on the "Reset all" button
          MarcAuthorities.clickReset();
          // need to wait until all filters will be reset
          cy.wait(1000);
          MarcAuthorities.checkDefaultBrowseOptions(
            sharedAuthorityRecord1FromCentralTenant.heading,
          );
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.checkTypeOfHeadingFacetCleared();
          MarcAuthorities.checkRecordsResultListIsAbsent();
          MarcAuthorities.verifySharedAccordionOpen(true);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
          MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
            cy.expect(count).to.not.eq(sharedRecordsCount);
          });
          MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
            cy.expect(count).to.not.eq(localRecordsCount);
          });
        },
      );
    });
  });
});
