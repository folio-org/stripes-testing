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

        const authData = { prefix: randomLetters, startWithNumber: 407628 };

        const testData = {
          authorityHeading: `AT_C407628_MarcAuthority_${randomPostfix}`,
          sharedBibTitle1: `AT_C407628_MarcBibInstance_Shared1_${randomPostfix}`,
          sharedBibTitle2: `AT_C407628_MarcBibInstance_Shared2_${randomPostfix}`,
          localBibTitle: `AT_C407628_MarcBibInstance_Local_${randomPostfix}`,
        };

        const authorityFields = [
          {
            tag: '100',
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ];

        const sharedBibFields1 = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${testData.sharedBibTitle1}`,
            indicators: ['1', '0'],
          },
          {
            tag: '100',
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ];

        const sharedBibFields2 = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${testData.sharedBibTitle2}`,
            indicators: ['1', '0'],
          },
          {
            tag: '100',
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ];

        const localBibFields = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${testData.localBibTitle}`,
            indicators: ['1', '0'],
          },
          {
            tag: '100',
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ];

        let user;
        let authorityId;
        let sharedBibId1;
        let sharedBibId2;
        let localBibId;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407628_');
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C407628_');
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C407628_');
          cy.resetTenant();

          // User created in Central (primary affiliation = Central, no affiliation switch needed on login)
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);

            cy.then(() => {
              // Create shared MARC authority and 2 shared bib records on Central
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((id) => {
                authorityId = id;
              });
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                sharedBibFields1,
              ).then((id) => {
                sharedBibId1 = id;
              });
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                sharedBibFields2,
              ).then((id) => {
                sharedBibId2 = id;
              });
            })
              .then(() => {
                // Link shared bibs to authority (Central context)
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: sharedBibId1,
                  authorityIds: [authorityId],
                  bibFieldTags: ['100'],
                  authorityFieldTags: ['100'],
                  finalBibFieldContents: [`$a ${testData.authorityHeading}`],
                });
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: sharedBibId2,
                  authorityIds: [authorityId],
                  bibFieldTags: ['100'],
                  authorityFieldTags: ['100'],
                  finalBibFieldContents: [`$a ${testData.authorityHeading}`],
                });
              })
              .then(() => {
                // Create local bib on Member (College) tenant
                cy.setTenant(Affiliations.College);
                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  localBibFields,
                ).then((id) => {
                  localBibId = id;
                });
              })
              .then(() => {
                // Link local bib to shared authority (College context)
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: localBibId,
                  authorityIds: [authorityId],
                  bibFieldTags: ['100'],
                  authorityFieldTags: ['100'],
                  finalBibFieldContents: [`$a ${testData.authorityHeading}`],
                });
              })
              .then(() => {
                // Assign College permissions to user
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
                ]);
              });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407628_');
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C407628_');
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C407628_');
        });

        it(
          'C407628 Delete linked Shared "MARC authority" record on Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C407628'] },
          () => {
            // Login to Central (primary affiliation)
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Steps 1-2: Search for authority, verify 2 linked titles (shared bibs visible from Central)
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.verifyResultsRowContent(testData.authorityHeading);
            MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.authorityHeading, 2);

            // Steps 3-6: Open authority record, delete it, verify deletion toast and record removed
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthoritiesDelete.clickDeleteButton();
            MarcAuthoritiesDelete.checkDeleteModal();
            MarcAuthoritiesDelete.confirmDelete();
            MarcAuthoritiesDelete.verifyDeleteComplete(testData.authorityHeading);

            // Step 7: Navigate to Inventory on Central
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();

            // Steps 8-9: Open first Shared bib, verify contributor has no authority icon
            InventoryInstances.searchByTitle(sharedBibId1);
            InventoryInstances.selectInstanceById(sharedBibId1);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              'list-contributors',
              testData.authorityHeading,
              false,
            );

            // Step 10: Open second Shared bib, verify contributor has no authority icon
            InventoryInstances.searchByTitle(sharedBibId2);
            InventoryInstances.selectInstanceById(sharedBibId2);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              'list-contributors',
              testData.authorityHeading,
              false,
            );

            // Step 11: View source of second Shared bib, verify 100 field is unlinked (no authority icon)
            InventoryInstance.viewSource();
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();

            // Step 12: Switch to Member (College) tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();

            // Steps 13-14: Check first Shared bib in Member context, no authority icon on contributor
            InventoryInstances.searchByTitle(sharedBibId1);
            InventoryInstances.selectInstanceById(sharedBibId1);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              'list-contributors',
              testData.authorityHeading,
              false,
            );

            // Step 15: Check second Shared bib in Member context, no authority icon on contributor
            InventoryInstances.searchByTitle(sharedBibId2);
            InventoryInstances.selectInstanceById(sharedBibId2);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              'list-contributors',
              testData.authorityHeading,
              false,
            );

            // Steps 16-17: Open Local bib on Member, verify no authority icon on contributor
            InventoryInstances.searchByTitle(localBibId);
            InventoryInstances.selectInstanceById(localBibId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              'list-contributors',
              testData.authorityHeading,
              false,
            );

            // Step 18: View source of Local bib, verify 100 field is unlinked (no authority icon)
            InventoryInstance.viewSource();
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
          },
        );
      });
    });
  });
});
