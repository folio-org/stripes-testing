import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Delete Authority', () => {
      describe('Consortium', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(17);

        const testData = {
          authorityHeading: `AT_C407657_MarcAuthority_${randomPostfix}`,
          localBibTitleM1: `AT_C407657_MarcBibInstance_LocalM1_${randomPostfix}`,
          contributorsSectionId: 'list-contributors',
          deleteQuery: 'AT_C407657_',
          naturalId: `${randomLetters}407657`,
        };

        const tags = {
          tag008: '008',
          tag110: '110',
          tag245: '245',
          tag710: '710',
        };

        const bibTag710Values = {
          tag: tags.tag710,
          ind1: '2',
          ind2: '\\',
          originalContent: `$a ${testData.authorityHeading}`,
          unlinkedContent: `$a ${testData.authorityHeading} $0 ${testData.naturalId}`,
        };

        const authorityFields = [
          {
            tag: tags.tag110,
            content: `$a ${testData.authorityHeading}`,
            indicators: ['2', '\\'],
          },
        ];

        const localBibFieldsM1 = [
          { tag: tags.tag008, content: QuickMarcEditor.valid008ValuesInstance },
          {
            tag: tags.tag245,
            content: `$a ${testData.localBibTitleM1}`,
            indicators: ['1', '1'],
          },
          {
            tag: bibTag710Values.tag,
            content: bibTag710Values.originalContent,
            indicators: [bibTag710Values.ind1, bibTag710Values.ind2],
          },
        ];

        const userPermissions = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ];

        let user;
        let authorityId;
        let localBibIdM1;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.deleteQuery);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.deleteQuery);

          // User created in College (Member 1) so primary affiliation = College
          // No affiliation switch needed on login - user starts directly in Member 1
          cy.createTempUser(userPermissions).then((userProperties) => {
            user = userProperties;

            // Assign University affiliation (Central is automatic)
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);

            // Central permissions (auto affiliation)
            cy.assignPermissionsToExistingUser(user.userId, userPermissions);

            cy.then(() => {
              // Create local MARC authority on Member 1 (College)
              cy.setTenant(Affiliations.College);
              MarcAuthorities.createMarcAuthorityViaAPI(
                testData.naturalId,
                '',
                authorityFields,
              ).then((id) => {
                authorityId = id;
              });

              // Create local bib record on Member 1 (College)
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                localBibFieldsM1,
              ).then((id) => {
                localBibIdM1 = id;
              });
            })
              .then(() => {
                // Link local bib to local authority (College context)
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: localBibIdM1,
                  authorityIds: [authorityId],
                  bibFieldTags: [bibTag710Values.tag],
                  authorityFieldTags: [tags.tag110],
                  finalBibFieldContents: [bibTag710Values.originalContent],
                });
              })
              .then(() => {
                // Assign University permissions to user
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(user.userId, userPermissions);
              });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.deleteQuery);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.deleteQuery);
          Users.deleteViaApi(user.userId);
        });

        it(
          'C407657 Delete local linked "MARC Authority" record in member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C407657'] },
          () => {
            // Login into Member 1 (College) - primary affiliation
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Precondition: open the local MARC authority record
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.verifyResultsRowContent(testData.authorityHeading);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);

            // Step 1: Delete authority, verify modal shows 1 linked record
            MarcAuthoritiesDelete.clickDeleteButton();
            MarcAuthoritiesDelete.checkDeleteModal();

            // Step 2: Confirm delete, verify toast and record removed from results
            MarcAuthoritiesDelete.confirmDelete();
            MarcAuthoritiesDelete.verifyDeleteComplete(testData.authorityHeading);

            // Step 3: Navigate to Inventory (Member 1)
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();

            // Steps 4-5: Open local bib, verify no authority icon, edit marc bib, verify 710 unlinked
            InventoryInstances.searchByTitle(localBibIdM1);
            InventoryInstances.selectInstanceById(localBibIdM1);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              testData.contributorsSectionId,
              testData.authorityHeading,
              false,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              bibTag710Values.tag,
              bibTag710Values.ind1,
              bibTag710Values.ind2,
              bibTag710Values.unlinkedContent,
            );
            QuickMarcEditor.closeEditorPane();

            // Steps 6-7: Switch to Central, open Inventory, search bib - no results (local record not visible)
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(testData.localBibTitleM1, false);
            InventorySearchAndFilter.verifyNoRecordsFound();

            // Steps 8-9: Open MARC Authority, search authority - no results (local authority not visible)
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthoritiesDelete.checkEmptySearchResults(testData.authorityHeading);

            // Steps 10-11: Switch to Member 2, open Inventory, search bib - no results
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(testData.localBibTitleM1, false);
            InventorySearchAndFilter.verifyNoRecordsFound();

            // Steps 12-13: Open MARC Authority, search authority - no results
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthoritiesDelete.checkEmptySearchResults(testData.authorityHeading);
          },
        );
      });
    });
  });
});
