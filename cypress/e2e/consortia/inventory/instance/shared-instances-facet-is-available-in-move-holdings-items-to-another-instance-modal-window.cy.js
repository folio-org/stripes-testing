import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstanceSelectInstanceModal from '../../../../support/fragments/inventory/modals/inventoryInstanceSelectInstanceModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        sharedInstance: {
          instanceTitle: `C594479 Instance${getRandomPostfix()}`,
          itemBarcode: getRandomPostfix(),
        },
        localInstance: {
          instanceTitle: `C594479 Instance${getRandomPostfix()}`,
          itemBarcode: getRandomPostfix(),
        },
      };

      before('Create test data and login', () => {
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          testData.sharedInstance.instanceId = InventoryInstances.createInstanceViaApi(
            testData.sharedInstance.instanceTitle,
            testData.sharedInstance.itemBarcode,
          );
          cy.getInstanceHRID(testData.sharedInstance.instanceId).then((instanceHRIDResponse) => {
            testData.sharedInstance.hrid = instanceHRIDResponse;
          });
        });
        cy.withinTenant(Affiliations.College, () => {
          cy.getLocations({ limit: 1 }).then((res) => {
            testData.localInstance.locationId = res.id;
          });
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.localInstance.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            testData.localInstance.holdingTypeId = holdingTypes[0].id;
          });
          cy.createLoanType({
            name: getTestEntityValue('type'),
          }).then((loanType) => {
            testData.localInstance.loanTypeId = loanType.id;
          });
          cy.getMaterialTypes({ limit: 1 })
            .then((materialTypes) => {
              testData.localInstance.materialTypeId = materialTypes.id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.localInstance.instanceTypeId,
                  title: testData.localInstance.instanceTitle,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.localInstance.holdingTypeId,
                    permanentLocationId: testData.localInstance.locationId,
                  },
                ],
                items: [
                  {
                    barcode: testData.localInstance.itemBarcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.localInstance.loanTypeId },
                    materialType: { id: testData.localInstance.materialTypeId },
                  },
                ],
              });
            })
            .then((instance) => {
              testData.localInstance.id = instance.instanceId;
            });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryMoveItems.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
            testData.sharedInstance.instanceId,
          );
          Users.deleteViaApi(testData.user.userId);
        });
        cy.withinTenant(Affiliations.College, () => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.localInstance.id);
        });
      });

      it(
        'C594479 (CONSORTIA) Shared instances facet is available in "Move holdings/items to another instance" modal window (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C594479'] },
        () => {
          InventoryInstances.searchByTitle(testData.localInstance.id);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.moveHoldingsItemsToAnotherInstance();
          InventoryInstanceSelectInstanceModal.waitLoading();
          InventoryInstanceSelectInstanceModal.verifySharedFacetExistsInFilter();
          InventoryInstanceSelectInstanceModal.searchByHrId(testData.sharedInstance.hrid);
          InventoryInstanceSelectInstanceModal.verifyInstanceExistsInList(
            testData.sharedInstance.instanceTitle,
          );
        },
      );
    });
  });
});
