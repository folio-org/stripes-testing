import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instanceTitle: `C411616 Instance ${getRandomPostfix()}`,
        itemBarcode: uuid(),
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });
        cy.setTenant(Affiliations.College)
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              testData.holdingTypeId = res[0].id;
            });
            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((location) => {
              testData.collegeLocation = location;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.loanTypeId = res[0].id;
            });
            cy.getBookMaterialType().then((res) => {
              testData.materialTypeId = res.id;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.collegeLocation.id,
                },
              ],
              items: [
                {
                  barcode: testData.itemBarcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((specialInstanceIds) => {
              testData.testInstanceIds = specialInstanceIds;

              cy.setTenant(Affiliations.College);
              InventoryInstance.shareInstanceViaApi(
                specialInstanceIds.instanceId,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
          });

        cy.resetTenant();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
        });
        cy.withinTenant(Affiliations.College, () => {
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
          Locations.deleteViaApi(testData.collegeLocation);
        });
      });

      it(
        'C411616 (CONSORTIA) Verify the Consortial holdings accordion details on shared Instance in Central Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411616'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();

          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instanceTitle, false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.expandMemberSubHoldings('College');
          InstanceRecordView.openHoldingsAccordion(testData.collegeLocation.name);
          InventoryInstance.checkIsItemCreated(testData.itemBarcode);
        },
      );
    });
  });
});
