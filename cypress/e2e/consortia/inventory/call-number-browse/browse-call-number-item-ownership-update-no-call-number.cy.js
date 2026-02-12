import { ITEM_STATUS_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitle = `AT_C869997_FolioInstance_${randomPostfix}`;
      const callNumberPrefix = `AT_C869997_CallNumber_${randomPostfix}`;
      const barcodeValue = `AT_C869997_Barcode_${randomPostfix}`;
      const heldbyAccordionName = 'Held by';
      const callNumbers = Array.from({ length: 2 }, (_, i) => `${callNumberPrefix}_${i}`);
      const testData = {
        instance: {},
        user: {},
        holdings: {},
      };
      const userPermissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiInventoryUpdateOwnership.gui,
      ];

      let loanTypeId;
      let materialTypeId;

      before('Create test data', () => {
        cy.then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          [Affiliations.University, Affiliations.College, Affiliations.Consortia].forEach(
            (affiliation) => {
              cy.withinTenant(affiliation, () => {
                InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C869997');
              });
            },
          );
        })
          .then(() => {
            cy.resetTenant();
            InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => {
              testData.instance = instanceData;
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
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
                barcode: barcodeValue,
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              testData.holdings.locationUniversity = res;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.holdings.locationUniversity.id,
              sourceId: testData.holdings.sourceId,
              callNumber: callNumbers[1],
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.createTempUser(userPermissions).then((userProperties) => {
              testData.user = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);
              cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);

              cy.setTenant(Affiliations.University);
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
        [Affiliations.University, Affiliations.College, Affiliations.Consortia].forEach(
          (affiliation) => {
            cy.withinTenant(affiliation, () => {
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C869997');
            });
          },
        );
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C869997 Verify that call number is browsable after ownership update of "Item" without call number to "Holdings" with call number (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C869997'] },
        () => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumbers[0]);

          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstanceById(testData.instance.instanceId);
          InventoryInstance.waitInstanceRecordViewOpened();

          InstanceRecordView.openHoldingItem({
            name: testData.holdings.location.name,
            barcode: barcodeValue,
          });
          ItemRecordView.updateOwnership(
            tenantNames.university,
            `${testData.holdings.locationUniversity.name} > ${callNumbers[1]}`,
          );
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyItemsCount(0, testData.holdings.location.name);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
          InstanceRecordView.verifyItemsCount(1, testData.holdings.locationUniversity.name);

          cy.wait(60 * 1000); // per test case - "Wait 1 minute"
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
          BrowseCallNumber.waitForCallNumberToAppear(callNumbers[0], false);
          BrowseCallNumber.waitForCallNumberToAppear(callNumbers[1]);

          InventorySearchAndFilter.browseSearch(callNumbers[0]);
          BrowseCallNumber.checkNonExactSearchResult(callNumbers[0]);

          InventorySearchAndFilter.browseSearch(callNumbers[1]);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1]);
        },
      );
    });
  });
});
