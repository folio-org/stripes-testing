import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instance: {
          instanceTitle: `C411670 Autotest Instance ${getRandomPostfix()}`,
          instanceTypeId: '',
        },
        holdings: {},
        item: { barcode: uuid() },
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College)
            .then(() => {
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                testData.instance.instanceTypeId = instanceTypes[0].id;
              });
              cy.getHoldingTypes({ limit: 1 }).then((res) => {
                testData.holdings.holdingTypeId = res[0].id;
              });
              ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
                const collegeLocationData = Locations.getDefaultLocation({
                  servicePointId: servicePoint.id,
                }).location;
                Locations.createViaApi(collegeLocationData).then((location) => {
                  testData.holdings.location = location;
                  testData.holdings.locationId = location.id;
                  testData.holdings.locationName = location.name;
                });
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.item.loanTypeId = res[0].id;
              });
              cy.getBookMaterialType().then((res) => {
                testData.item.materialTypeId = res.id;
              });
            })
            .then(() => {
              // create shadow instance with holdings and item
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instance.instanceTypeId,
                  title: testData.instance.instanceTitle,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdings.holdingTypeId,
                    permanentLocationId: testData.holdings.locationId,
                  },
                ],
                items: [
                  {
                    barcode: testData.item.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.item.loanTypeId },
                    materialType: { id: testData.item.materialTypeId },
                  },
                ],
              }).then((specialInstanceIds) => {
                testData.instance.id = specialInstanceIds.instanceId;
                testData.holdings.id = specialInstanceIds.holdingIds[0].id;
                testData.item.id = specialInstanceIds.items[0].id;

                InventoryInstance.shareInstanceViaApi(
                  testData.instance.id,
                  testData.consortiaId,
                  Affiliations.College,
                  Affiliations.Consortia,
                );
              });
            });
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryItems.deleteItemViaApi(testData.item.id);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.holdings.id);
        Locations.deleteViaApi(testData.holdings.location);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.id);
      });

      it(
        'C411670 (CONSORTIA) Verify Item barcode hyperlink closing on Consortial holdings accordion details on shared Instance in Central Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411670'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.id);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instance.id, false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
          InstanceRecordView.expandHoldings([`${testData.holdings.locationName}`]);
          InstanceRecordView.openItemByHyperlink(testData.item.barcode);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          ItemRecordView.checkBarcode(testData.item.barcode);
          ItemRecordView.closeDetailView();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instance.id, true);
        },
      );
    });
  });
});
