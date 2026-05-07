import Permissions from '../../../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      describe('Consortia', () => {
        const testData = {
          marcBibTitle: `AT_C788749_MarcBibInstance_${getRandomPostfix()}`,
        };

        let user;
        let instanceId;
        let holdingsId;
        let location;

        before('Create test data and login', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Get a location in Member 1 tenant
          cy.setTenant(Affiliations.College);
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((loc) => {
            location = loc;

            // Create Local MARC bib in Member 1 tenant
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceRecordId) => {
              instanceId = instanceRecordId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                // Create MARC holdings in Member 1 tenant
                cy.createMarcHoldingsViaAPI(instanceId, [
                  {
                    content: instanceData.hrid,
                    tag: '004',
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: '008',
                  },
                  {
                    content: `$b ${location.code}`,
                    indicators: ['\\', '\\'],
                    tag: '852',
                  },
                ]).then((holdingRecordId) => {
                  holdingsId = holdingRecordId;
                });
              });
            });
          });

          // Create user in Member 1 tenant (where they'll work)
          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Assign Central tenant permissions (Central affiliation is automatic)
            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Delete user, holdings, instance` from Member 1 tenant (where created)
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        });

        it(
          'C788749 Delete MARC holdings record attached to Local MARC bib (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C788749'] },
          () => {
            // Login to Member 1 tenant
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });

            // Verify logged into College tenant (primary affiliation)
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Step 1: Open holdings record
            InventoryInstances.searchByTitle(instanceId);
            InventoryInstances.selectInstanceById(instanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.openHoldingView();
            HoldingsRecordView.waitLoading();

            // Step 2: Set up network interception for DELETE request
            cy.intercept('DELETE', `**/holdings-storage/holdings/${holdingsId}**`).as(
              'deleteHoldingsRecord',
            );

            // Step 3: Delete holdings record via Actions menu
            HoldingsRecordView.delete();

            // Verify DELETE request returns 204 status code
            cy.wait('@deleteHoldingsRecord').then((interception) => {
              expect(interception.response.statusCode).to.equal(204);
            });

            // Verify back to instance view and holdings record deleted
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Verify MARC holdings record was deleted
            InventoryInstance.verifyHoldingsAbsent(location.name);
            cy.getHoldings({ query: `id=="${holdingsId}"` }).then((holdings) => {
              expect(holdings.length).to.equal(0);
            });
          },
        );
      });
    });
  });
});
