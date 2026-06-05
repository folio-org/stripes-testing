import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
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
          authorityHeading: `AT_C407656_MarcAuthority_${randomPostfix}`,
          sharedBibTitle1: `AT_C407656_MarcBibInstance_Shared1_${randomPostfix}`,
          sharedBibTitle2: `AT_C407656_MarcBibInstance_Shared2_${randomPostfix}`,
          sharedBibTitle3: `AT_C407656_MarcBibInstance_Shared3_${randomPostfix}`,
          localBibTitleM1: `AT_C407656_MarcBibInstance_LocalM1_${randomPostfix}`,
          localBibTitleM2: `AT_C407656_MarcBibInstance_LocalM2_${randomPostfix}`,
          contributorsSectionId: 'list-contributors',
          deleteQuery: 'AT_C407656_',
          naturalId: `${randomLetters}407656`,
        };

        const tags = {
          tag008: '008',
          tag100: '100',
          tag245: '245',
        };

        const bibTag100Values = {
          tag: tags.tag100,
          ind1: '1',
          ind2: '\\',
          originalContent: `$a ${testData.authorityHeading}`,
          unlinkedContent: `$a ${testData.authorityHeading} $0 ${testData.naturalId}`,
        };

        const authorityFields = [
          {
            tag: tags.tag100,
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ];

        const sharedBibFields1 = [
          { tag: tags.tag008, content: QuickMarcEditor.valid008ValuesInstance },
          {
            tag: tags.tag245,
            content: `$a ${testData.sharedBibTitle1}`,
            indicators: ['1', '1'],
          },
          {
            tag: bibTag100Values.tag,
            content: bibTag100Values.originalContent,
            indicators: [bibTag100Values.ind1, bibTag100Values.ind2],
          },
        ];

        const sharedBibFields2 = [
          { tag: tags.tag008, content: QuickMarcEditor.valid008ValuesInstance },
          {
            tag: tags.tag245,
            content: `$a ${testData.sharedBibTitle2}`,
            indicators: ['1', '1'],
          },
          {
            tag: bibTag100Values.tag,
            content: bibTag100Values.originalContent,
            indicators: [bibTag100Values.ind1, bibTag100Values.ind2],
          },
        ];

        const sharedBibFields3 = [
          { tag: tags.tag008, content: QuickMarcEditor.valid008ValuesInstance },
          {
            tag: tags.tag245,
            content: `$a ${testData.sharedBibTitle3}`,
            indicators: ['1', '1'],
          },
          {
            tag: bibTag100Values.tag,
            content: bibTag100Values.originalContent,
            indicators: [bibTag100Values.ind1, bibTag100Values.ind2],
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
            tag: bibTag100Values.tag,
            content: bibTag100Values.originalContent,
            indicators: [bibTag100Values.ind1, bibTag100Values.ind2],
          },
        ];

        const localBibFieldsM2 = [
          { tag: tags.tag008, content: QuickMarcEditor.valid008ValuesInstance },
          {
            tag: tags.tag245,
            content: `$a ${testData.localBibTitleM2}`,
            indicators: ['1', '1'],
          },
          {
            tag: bibTag100Values.tag,
            content: bibTag100Values.originalContent,
            indicators: [bibTag100Values.ind1, bibTag100Values.ind2],
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
        let sharedBibId1;
        let sharedBibId2;
        let sharedBibId3;
        let localBibIdM1;
        let localBibIdM2;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.deleteQuery);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.deleteQuery);
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.deleteQuery);
          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.deleteQuery);

          // User created in College (Member 1) so primary affiliation = College
          // No affiliation switch needed on login - user starts directly in Member 1
          cy.setTenant(Affiliations.College);
          cy.createTempUser(userPermissions).then((userProperties) => {
            user = userProperties;

            // Assign University affiliation (Central is automatic)
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);

            // Central permissions (auto affiliation): MARC authority view+delete, inventory, quickMarcAll
            cy.assignPermissionsToExistingUser(user.userId, userPermissions);

            cy.then(() => {
              // Create shared MARC authority on Central
              MarcAuthorities.createMarcAuthorityViaAPI(
                testData.naturalId,
                '',
                authorityFields,
              ).then((id) => {
                authorityId = id;
              });

              // Create 3 shared bib records on Central
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
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                sharedBibFields3,
              ).then((id) => {
                sharedBibId3 = id;
              });
            })
              .then(() => {
                // Link all 3 shared bibs to authority (Central context)
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: sharedBibId1,
                  authorityIds: [authorityId],
                  bibFieldTags: [bibTag100Values.tag],
                  authorityFieldTags: [bibTag100Values.tag],
                  finalBibFieldContents: [bibTag100Values.originalContent],
                });
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: sharedBibId2,
                  authorityIds: [authorityId],
                  bibFieldTags: [bibTag100Values.tag],
                  authorityFieldTags: [bibTag100Values.tag],
                  finalBibFieldContents: [bibTag100Values.originalContent],
                });
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: sharedBibId3,
                  authorityIds: [authorityId],
                  bibFieldTags: [bibTag100Values.tag],
                  authorityFieldTags: [bibTag100Values.tag],
                  finalBibFieldContents: [bibTag100Values.originalContent],
                });
              })
              .then(() => {
                // Create local bib on Member 1 (College) and link to shared authority
                cy.setTenant(Affiliations.College);
                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  localBibFieldsM1,
                ).then((id) => {
                  localBibIdM1 = id;
                });
              })
              .then(() => {
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: localBibIdM1,
                  authorityIds: [authorityId],
                  bibFieldTags: [bibTag100Values.tag],
                  authorityFieldTags: [bibTag100Values.tag],
                  finalBibFieldContents: [bibTag100Values.originalContent],
                });
              })
              .then(() => {
                // Create local bib on Member 2 (University) and link to shared authority
                cy.setTenant(Affiliations.University);
                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  localBibFieldsM2,
                ).then((id) => {
                  localBibIdM2 = id;
                });
              })
              .then(() => {
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: localBibIdM2,
                  authorityIds: [authorityId],
                  bibFieldTags: [bibTag100Values.tag],
                  authorityFieldTags: [bibTag100Values.tag],
                  finalBibFieldContents: [bibTag100Values.originalContent],
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.deleteQuery);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.deleteQuery);
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.deleteQuery);
          Users.deleteViaApi(user.userId);
          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.deleteQuery);
        });

        it(
          'C407656 Delete shared linked "MARC Authority" record in member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C407656'] },
          () => {
            // Login into Member 1 (College) - primary affiliation
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Step 1: Search for shared MARC authority record
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.verifyResultsRowContent(testData.authorityHeading);

            // Steps 2-3: Delete authority, verify modal and deletion
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthoritiesDelete.clickDeleteButton();
            MarcAuthoritiesDelete.checkDeleteModal();
            MarcAuthoritiesDelete.confirmDelete();
            MarcAuthoritiesDelete.verifyDeleteComplete(testData.authorityHeading);

            // Step 4: Navigate to Inventory (Member 1)
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();

            // Steps 5-7: Open Shared Bib 1, edit marc bib, verify 100 field is unlinked
            InventoryInstances.searchByTitle(sharedBibId1);
            InventoryInstances.selectInstanceById(sharedBibId1);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              bibTag100Values.tag,
              bibTag100Values.ind1,
              bibTag100Values.ind2,
              bibTag100Values.unlinkedContent,
            );
            QuickMarcEditor.closeEditorPane();

            // Steps 8-10: Open Shared Bib 2, verify no authority icon, edit marc bib, verify 100 unlinked
            InventoryInstances.searchByTitle(sharedBibId2);
            InventoryInstances.selectInstanceById(sharedBibId2);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              testData.contributorsSectionId,
              testData.authorityHeading,
              false,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              bibTag100Values.tag,
              bibTag100Values.ind1,
              bibTag100Values.ind2,
              bibTag100Values.unlinkedContent,
            );
            QuickMarcEditor.closeEditorPane();

            // Steps 11-12: Open Local Bib M1, verify no authority icon, edit marc bib, verify 100 unlinked
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
              bibTag100Values.tag,
              bibTag100Values.ind1,
              bibTag100Values.ind2,
              bibTag100Values.unlinkedContent,
            );
            QuickMarcEditor.closeEditorPane();

            // Step 13: Switch to Central tenant, open Inventory
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();

            // Steps 14-15: Open Shared Bib 3, verify no authority icon, edit marc bib, verify 100 unlinked
            InventoryInstances.searchByTitle(sharedBibId3);
            InventoryInstances.selectInstanceById(sharedBibId3);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              testData.contributorsSectionId,
              testData.authorityHeading,
              false,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              bibTag100Values.tag,
              bibTag100Values.ind1,
              bibTag100Values.ind2,
              bibTag100Values.unlinkedContent,
            );
            QuickMarcEditor.closeEditorPane();

            // Step 16: Switch to Member 2 (University), open Inventory
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();

            // Steps 17-18: Open Local Bib M2, verify no authority icon, edit marc bib, verify 100 unlinked
            InventoryInstances.searchByTitle(localBibIdM2);
            InventoryInstances.selectInstanceById(localBibIdM2);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkAuthorityAppIconInSection(
              testData.contributorsSectionId,
              testData.authorityHeading,
              false,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              bibTag100Values.tag,
              bibTag100Values.ind1,
              bibTag100Values.ind2,
              bibTag100Values.unlinkedContent,
            );
          },
        );
      });
    });
  });
});
