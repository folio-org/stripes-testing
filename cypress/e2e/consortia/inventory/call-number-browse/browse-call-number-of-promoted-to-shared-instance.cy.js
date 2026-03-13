import { ITEM_STATUS_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitle = `AT_C1045429_FolioInstance_${randomPostfix}`;
      const callNumberPrefix = `AT_C1045429_CallNumber_${randomPostfix}`;
      const heldbyAccordionName = 'Held by';
      const callNumbers = Array.from({ length: 2 }, (_, i) => `${callNumberPrefix}_${i}`);
      const testData = {
        instance: {},
        user: {},
        holdings: {},
        sharedAccordionName: 'Shared',
      };
      const userPermissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.consortiaInventoryShareLocalInstance.gui,
      ];

      let loanTypeId;
      let materialTypeId;

      before('Create test data', () => {
        cy.then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          [Affiliations.College, Affiliations.Consortia].forEach((affiliation) => {
            cy.withinTenant(affiliation, () => {
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C1045429');
            });
          });
        })
          .then(() => {
            cy.setTenant(Affiliations.College);
            InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => {
              testData.instance = instanceData;
            });
          })
          .then(() => {
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              testData.holdings.location = res;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdings.sourceId = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeId = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeId = res.id;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.holdings.location.id,
              sourceId: testData.holdings.sourceId,
              callNumber: callNumbers[0],
            }).then((holdings) => {
              InventoryItems.createItemViaApi({
                holdingsRecordId: holdings.id,
                materialType: { id: materialTypeId },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                itemLevelCallNumber: callNumbers[1],
              });
              InventoryItems.createItemViaApi({
                holdingsRecordId: holdings.id,
                materialType: { id: materialTypeId },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.createTempUser(userPermissions).then((userProperties) => {
              testData.user = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        [Affiliations.College, Affiliations.Consortia].forEach((affiliation) => {
          cy.withinTenant(affiliation, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C1045429');
          });
        });
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1045429 Verify that call numbers are browsable after sharing a local instance (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C1045429'] },
        () => {
          // Step 1: Browse for each call number value from preconditions
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
          BrowseCallNumber.waitForCallNumberToAppear(callNumbers[0]);
          BrowseCallNumber.waitForCallNumberToAppear(callNumbers[1]);
          InventorySearchAndFilter.browseSearch(callNumbers[0]);

          // Step 2: Expand "Shared" facet and select "No" option
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0]);
          InventorySearchAndFilter.browseSearch(callNumbers[1]);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1]);

          // Step 3: Click on "Reset all" button
          InventorySearchAndFilter.clickResetAllButton();

          // Step 4: Open detail view pane of "Instance" record from preconditions at Member 1
          InventorySearchAndFilter.switchToSearchTab();
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstanceById(testData.instance.instanceId);
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 5: Share local Instance
          InventoryInstance.shareInstance();
          InventoryInstance.checkSharedTextInDetailView();

          // Step 6: Wait 1 minute and browse for each call number value from preconditions
          cy.wait(60 * 1000);
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
          BrowseCallNumber.waitForCallNumberToAppear(callNumbers[0]);
          BrowseCallNumber.waitForCallNumberToAppear(callNumbers[1]);
          InventorySearchAndFilter.browseSearch(callNumbers[0]);

          // Step 7: Expand "Shared" facet and select "Yes" option
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'Yes',
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0]);
          InventorySearchAndFilter.browseSearch(callNumbers[1]);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1]);
        },
      );
    });
  });
});
