import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();

        const marcFieldTags = {
          tag008: '008',
          tag245: '245',
        };

        const sharedMarcRecordHeader = 'Edit shared MARC record';

        const testData = {
          instanceTitleOriginal: `AT_C405524_MarcBibInstance_${randomPostfix}`,
          instanceTitleUpdatedByA: `AT_C405524_MarcBibInstance_${randomPostfix} Updated by A`,
          instanceTitleUpdatedByB: `AT_C405524_MarcBibInstance_${randomPostfix} Updated by B`,
        };

        const marcBibFields = [
          {
            tag: marcFieldTags.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: marcFieldTags.tag245,
            content: `$a ${testData.instanceTitleOriginal}`,
            indicators: ['1', '1'],
          },
        ];

        let userA;
        let userB;
        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('C405524_');

          // Create shared MARC bib in Central tenant
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdRecordIDs.push(instanceId);
            },
          );

          // Create User A in College tenant (primary affiliation = College)
          // This ensures User A logs into College tenant directly without affiliation switch
          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            userA = userProperties;

            // Assign Central tenant permissions (Central affiliation is automatic)
            cy.resetTenant();
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          });

          // Create User B in Central tenant only
          cy.resetTenant();
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            userB = userProperties;
          });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Delete User A from College tenant (where it was created)
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);
          // Delete User B from Central tenant (where it was created)
          cy.resetTenant();
          Users.deleteViaApi(userB.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        });

        it(
          'C405524 Optimistic locking in member tenant when shared "MARC Bib" record updated by another user in Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C405524'] },
          () => {
            // Steps 1-2: User A logs in to Member tenant, opens record for editing
            cy.setTenant(Affiliations.College);
            cy.login(userA.username, userA.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstanceById(createdRecordIDs[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.checkPaneheaderContains(sharedMarcRecordHeader);
            // Verify initial 245 field value
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag245,
              `$a ${testData.instanceTitleOriginal}`,
            );

            // Steps 3-5: While User A has the record open, User B updates the record via API
            // This makes User A's version stale and triggers optimistic locking conflict
            cy.resetTenant();
            cy.getToken(userB.username, userB.password).then(() => {
              cy.getMarcRecordDataViaAPI(createdRecordIDs[0]).then((marcData) => {
                const field245 = marcData.fields.find((f) => f.tag === marcFieldTags.tag245);
                field245.content = `$a ${testData.instanceTitleUpdatedByB}`;
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData)
                  .then(({ status }) => {
                    expect(status).to.eq(202);
                    // Switch back to User A's token
                    cy.setTenant(Affiliations.College);
                    cy.clearCookies({ domain: null });
                    cy.getToken(userA.username, userA.password);
                  })
                  .then(() => {
                    // Step 6: User A makes changes to 245 field, tries to save (will trigger conflict because record was updated by User B)
                    QuickMarcEditor.updateExistingField(
                      marcFieldTags.tag245,
                      `$a ${testData.instanceTitleUpdatedByA}`,
                    );
                    QuickMarcEditor.pressSaveAndCloseButton();

                    // Step 6: Verify conflict detection message and link
                    QuickMarcEditor.verifyOptimisticLockingBanner();
                    QuickMarcEditor.clickViewLatestVersionLink();

                    // Step 7: Verify latest version shows User B's changes
                    InventoryInstance.waitLoading();
                    InventoryInstance.waitInstanceRecordViewOpened();
                    InventoryInstance.checkExpectedMARCSource();
                    InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByB);

                    // Step 8: Open edit again and verify User B's changes in MARC editor
                    InventoryInstance.editMarcBibliographicRecord();
                    QuickMarcEditor.waitLoading();
                    QuickMarcEditor.checkPaneheaderContains(sharedMarcRecordHeader);
                    QuickMarcEditor.checkContentByTag(
                      marcFieldTags.tag245,
                      `$a ${testData.instanceTitleUpdatedByB}`,
                    );
                    QuickMarcEditor.checkUserNameInHeader(userB.firstName, userB.lastName);
                  });
              });
            });
          },
        );
      });
    });
  });
});
