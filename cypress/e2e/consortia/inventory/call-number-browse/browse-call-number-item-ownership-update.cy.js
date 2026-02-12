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
      const instanceTitle = `AT_C869996_FolioInstance_${randomPostfix}`;
      const callNumberPrefix = `AT_C869996_CallNumber_${randomPostfix}`;
      const barcodePrefix = `AT_C869996_Barcode_${randomPostfix}`;
      const heldbyAccordionName = 'Held by';
      const callNumbers = Array.from({ length: 2 }, (_, i) => `${callNumberPrefix}_${i}`);
      const barcodes = Array.from({ length: 2 }, (_, i) => `${barcodePrefix}_${i}`);
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
      let loanTypeIdUniversity;
      let materialTypeIdUniversity;

      before('Create test data', () => {
        cy.then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          [Affiliations.University, Affiliations.College, Affiliations.Consortia].forEach(
            (affiliation) => {
              cy.withinTenant(affiliation, () => {
                InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C869996');
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
            }).then((holdings) => {
              InventoryItems.createItemViaApi({
                holdingsRecordId: holdings.id,
                materialType: { id: materialTypeId },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                itemLevelCallNumber: callNumbers[0],
                barcode: barcodes[0],
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
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeIdUniversity = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeIdUniversity = res.id;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.holdings.locationUniversity.id,
              sourceId: testData.holdings.sourceId,
            }).then((holdings) => {
              InventoryItems.createItemViaApi({
                holdingsRecordId: holdings.id,
                materialType: { id: materialTypeIdUniversity },
                permanentLoanType: { id: loanTypeIdUniversity },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                itemLevelCallNumber: callNumbers[1],
                barcode: barcodes[1],
              });
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
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C869996');
            });
          },
        );
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C869996 Verify that call number is still browsable after "Item" ownership update (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C869996'] },
        () => {
          callNumbers.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          });

          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstanceById(testData.instance.instanceId);
          InstanceRecordView.waitLoading();

          InstanceRecordView.openHoldingItem({
            name: testData.holdings.location.name,
            barcode: barcodes[0],
          });
          ItemRecordView.updateOwnership(
            tenantNames.university,
            testData.holdings.locationUniversity.name,
          );
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyItemsCount(0, testData.holdings.location.name);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
          InstanceRecordView.verifyItemsCount(2, testData.holdings.locationUniversity.name);

          cy.wait(60 * 1000); // per test case - "Wait 1 minute"
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
          callNumbers.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);

            InventorySearchAndFilter.browseSearch(callNumber);
            BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          });
        },
      );
    });
  });
});
