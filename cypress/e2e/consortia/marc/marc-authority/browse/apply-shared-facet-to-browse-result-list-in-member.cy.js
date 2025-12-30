import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  MARC_AUTHORITY_BROWSE_OPTIONS,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
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
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: tenantNames.central,
          affiliation: Affiliations.Consortia,
          numOfRecords: 2,
          createdRecordIDs: [],
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileForC404449LocalMember1.mrc',
          fileName: `C404449 Local testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: tenantNames.college,
          affiliation: Affiliations.College,
          numOfRecords: 2,
          createdRecordIDs: [],
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileForC404449LocalMember2.mrc',
          fileName: `C404449 Local testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: tenantNames.university,
          affiliation: Affiliations.University,
          numOfRecords: 2,
          createdRecordIDs: [],
          propertyName: 'authority',
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

      let authoritiesCount;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="C404449" and (authRefType==("Authorized" or "Auth/Ref"))',
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id, true);
            });
          }
        });
        cy.resetTenant();
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="C404449" and (authRefType==("Authorized" or "Auth/Ref"))',
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id);
            });
          }
        });
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((userProperties) => {
            users.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
            cy.setTenant(Affiliations.University);
            cy.wait(10_000);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
          })
          .then(() => {
            marcFiles.forEach((marcFile) => {
              if (marcFile.tenant === 'University') {
                cy.setTenant(Affiliations.University);
              } else if (marcFile.tenant === 'College') {
                cy.setTenant(Affiliations.College);
              } else {
                cy.resetTenant();
                cy.getAdminToken();
              }

              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  marcFile.createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.getAuthoritiesCountViaAPI().then((count) => {
              authoritiesCount = count;
            });
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            MarcAuthorities.switchToBrowse();
            MarcAuthorities.selectSearchOptionInDropdown(
              MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
            );
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        marcFiles.forEach((marcFile) => {
          cy.setTenant(marcFile.affiliation);
          marcFile.createdRecordIDs.forEach((record) => {
            MarcAuthority.deleteViaAPI(record, true);
          });
        });
      });

      it(
        'C404449 Apply "Shared" facet to the browse result list in "Member" tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C404449'] },
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
          cy.then(() => {
            MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
              sharedRecordsCount = count;
            });
            MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
              localRecordsCount = count;
            });
          }).then(() => {
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
            cy.wait(3000);
            cy.then(() => {
              MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then((count) => {
                cy.expect(count).to.eq(sharedRecordsCount);
              });
              MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then((count) => {
                cy.expect(count).to.eq(localRecordsCount);
              });
            }).then(() => {
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
              cy.wait(3000);
              cy.then(() => {
                MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then(
                  (count) => {
                    cy.expect(count).to.eq(sharedRecordsCount);
                  },
                );
                MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then(
                  (count) => {
                    cy.expect(count).to.eq(localRecordsCount);
                  },
                );
              }).then(() => {
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

                if (authoritiesCount > 100) {
                  MarcAuthorities.checkPreviousAndNextPaginationButtonsShown();
                  // 9 Click on any pagination button, ex.: "Next"
                  MarcAuthorities.clickNextPagination();
                  MarcAuthorities.checkRowAbsentByContent(
                    sharedAuthorityRecord1FromCentralTenant.heading,
                  );
                  MarcAuthorities.verifySharedAccordionOpen(true);
                  MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
                  MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
                }

                cy.wait(3000);
                cy.then(() => {
                  MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then(
                    (count) => {
                      cy.expect(count).to.eq(sharedRecordsCount);
                    },
                  );
                  MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then(
                    (count) => {
                      cy.expect(count).to.eq(localRecordsCount);
                    },
                  );
                }).then(() => {
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
                  cy.wait(3000);
                  cy.then(() => {
                    MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then(
                      (count) => {
                        cy.expect(count).to.not.eq(sharedRecordsCount);

                        sharedRecordsCount = count;
                      },
                    );
                    MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.NO).then(
                      (count) => {
                        cy.expect(count).to.not.eq(localRecordsCount);

                        localRecordsCount = count;
                      },
                    );
                  }).then(() => {
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
                    MarcAuthorities.verifyCheckboxInAccordion(
                      Dropdowns.SHARED,
                      Dropdowns.YES,
                      true,
                    );
                    MarcAuthorities.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
                    cy.wait(3000);
                    cy.then(() => {
                      MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then(
                        (count) => {
                          cy.expect(+count).to.be.at.most(+sharedRecordsCount);

                          sharedRecordsCount = count;
                        },
                      );
                    }).then(() => {
                      // 13 Click on the "Reset all" button
                      MarcAuthorities.clickReset();
                      // need to wait until all filters will be reset
                      cy.wait(1000);
                      MarcAuthorities.checkDefaultBrowseOptions(
                        sharedAuthorityRecord1FromCentralTenant.heading,
                      );
                      MarcAuthorities.verifyCheckboxInAccordion(
                        Dropdowns.SHARED,
                        Dropdowns.YES,
                        false,
                      );
                      MarcAuthorities.verifyCheckboxInAccordion(
                        Dropdowns.SHARED,
                        Dropdowns.NO,
                        false,
                      );
                      MarcAuthorities.checkTypeOfHeadingFacetCleared();
                      MarcAuthorities.checkRecordsResultListIsAbsent();
                      MarcAuthorities.verifySharedAccordionOpen(true);
                      MarcAuthorities.verifyCheckboxInAccordion(
                        Dropdowns.SHARED,
                        Dropdowns.YES,
                        false,
                      );
                      MarcAuthorities.verifyCheckboxInAccordion(
                        Dropdowns.SHARED,
                        Dropdowns.NO,
                        false,
                      );
                      cy.wait(3000);
                      MarcAuthorities.getRecordsCountInOptionsInSharedFacet(Dropdowns.YES).then(
                        (count) => {
                          cy.expect(count).to.not.eq(sharedRecordsCount);
                        },
                      );
                    });
                  });
                });
              });
            });
          });
        },
      );
    });
  });
});
