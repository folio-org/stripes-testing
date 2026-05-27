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

        const testData = {
          instanceTitleOriginal: `AT_C410828_MarcBibInstance_${randomPostfix}`,
          instanceTitleUpdatedByA: `AT_C410828_MarcBibInstance_${randomPostfix} Updated by A`,
          instanceTitleUpdatedByB: `AT_C410828_MarcBibInstance_${randomPostfix} Updated by B`,
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

          // Create local MARC bib in Member (College) tenant
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi('C410828_');

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdRecordIDs.push(instanceId);
            },
          );

          // Create User A in Member (College) tenant
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            userA = userProperties;
          });

          // Create User B in Member (College) tenant
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
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        });

        it(
          'C410828 Optimistic locking in Member tenant when local "MARC Bib" record updated by another user in the same Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C410828'] },
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
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag245,
              `$a ${testData.instanceTitleOriginal}`,
            );

            // Steps 3-5: While User A has the record open, User B updates and saves via API
            cy.setTenant(Affiliations.College);
            cy.getToken(userB.username, userB.password).then(() => {
              cy.getMarcRecordDataViaAPI(createdRecordIDs[0]).then((marcData) => {
                const field245 = marcData.fields.find((f) => f.tag === marcFieldTags.tag245);
                field245.content = `$a ${testData.instanceTitleUpdatedByB}`;
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                  ({ status }) => {
                    expect(status).to.eq(202);

                    // Switch back to User A's token in College tenant
                    cy.getToken(userA.username, userA.password);

                    // Step 6: User A makes changes to 245 field and tries to save
                    // This triggers an OL conflict because User B already updated the record
                    QuickMarcEditor.updateExistingField(
                      marcFieldTags.tag245,
                      `$a ${testData.instanceTitleUpdatedByA}`,
                    );
                    QuickMarcEditor.pressSaveAndCloseButton();

                    // Step 6: Verify conflict detection banner and link
                    QuickMarcEditor.verifyOptimisticLockingBanner();
                    QuickMarcEditor.clickViewLatestVersionLink();

                    // Step 7: Verify detail view shows User B's changes
                    InventoryInstance.waitLoading();
                    InventoryInstance.waitInstanceRecordViewOpened();
                    InventoryInstance.checkExpectedMARCSource();
                    InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByB);

                    // Step 8: Reopen edit and verify User B's changes are applied, User A's are not
                    InventoryInstance.editMarcBibliographicRecord();
                    QuickMarcEditor.waitLoading();
                    QuickMarcEditor.checkContentByTag(
                      marcFieldTags.tag245,
                      `$a ${testData.instanceTitleUpdatedByB}`,
                    );
                    QuickMarcEditor.checkUserNameInHeader(userB.firstName, userB.lastName);
                  },
                );
              });
            });
          },
        );
      });
    });
  });
});
