import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';

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
          instanceTitleOriginal: `AT_C410822_MarcBibInstance_${randomPostfix}`,
          instanceTitleUpdatedByA: `AT_C410822_MarcBibInstance_${randomPostfix} Updated by A`,
          instanceTitleUpdatedByB: `AT_C410822_MarcBibInstance_${randomPostfix} Updated by B`,
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
        let locationId;
        let holdingId;
        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('C410822_');

          // Create shared MARC bib in Central tenant
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdRecordIDs.push(instanceId);

              // Create Holdings in Member 1 (College)
              cy.setTenant(Affiliations.College);
              cy.getLocations({ limit: 1 }).then((res) => {
                locationId = res.id;
              });
              InventoryHoldings.getHoldingsFolioSource().then((holdingSources) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId,
                  permanentLocationId: locationId,
                  sourceId: holdingSources.id,
                }).then((holding) => {
                  holdingId = holding.id;
                });
              });
            },
          );

          // Create User A with affiliations in both Central and Member 1 tenants
          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            userA = userProperties;

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          });

          // Create User B with affiliations in both Central and Member 2 tenants
          cy.resetTenant();
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            userB = userProperties;

            cy.assignAffiliationToUser(Affiliations.University, userB.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(userB.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Users.deleteViaApi(userA.userId);
          // Users.deleteViaApi(userB.userId);
          cy.setTenant(Affiliations.College);
          InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        });

        it(
          'C410822 Optimistic locking in Member tenant when shared "MARC Bib" record (shadow MARC Instance) updated by another user in another Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C410822'] },
          () => {
            // Steps 1-2: User A logs in to Member 1 tenant, opens record for editing
            cy.setTenant(Affiliations.College);
            cy.login(userA.username, userA.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstanceById(createdRecordIDs[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
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
                marcData.relatedRecordVersion = 1;
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                  ({ status }) => {
                    expect(status).to.eq(202);
                    // Switch back to User A's token
                    cy.setTenant(Affiliations.College);
                    cy.clearCookies({ domain: null });
                    cy.getToken(userA.username, userA.password);

                    // Step 6: User A makes changes to 245 field, tries to save (will trigger conflict because record was updated by User B)
                    QuickMarcEditor.updateExistingField(
                      marcFieldTags.tag245,
                      `$a ${testData.instanceTitleUpdatedByA}`,
                    );
                    QuickMarcEditor.pressSaveAndCloseButton();

                    // Step 6-7: Verify conflict detection message and link
                    QuickMarcEditor.verifyOptimisticLockingBanner();
                    QuickMarcEditor.clickViewLatestVersionLink();

                    // Step 7: Verify latest version shows User B's changes
                    InventoryInstance.waitLoading();
                    InventoryInstance.waitInstanceRecordViewOpened();
                    InventoryInstance.checkExpectedMARCSource();
                    InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByB);

                    // Step 8: Open edit again and verify User B's changes in MARC editor
                    InventoryInstance.editMarcBibliographicRecord();
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
