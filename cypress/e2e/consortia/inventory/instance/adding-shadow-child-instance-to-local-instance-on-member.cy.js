import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOAN_TYPE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      const testData = {
        shadowInstance: {
          instanceTitle: `C413366 Autotest Instance ${getRandomPostfix()}`,
        },
        shadowHoldings: {},
        shadowItem: { barcode: uuid() },
      };

      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });
        cy.withinTenant(Affiliations.College, () => {
          // create local instance
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.localInstance = instanceData;
            cy.getInstanceById(testData.localInstance.instanceId).then((instance) => {
              testData.localInstance.instanceHRID = instance.hrid;
            });
          });
          cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
            testData.shadowInstance.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.shadowHoldings.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: '(isActive=true and name<>"*auto*" and name<>"AT_*")' }).then(
            (res) => {
              testData.shadowHoldings.locationId = res.id;
            },
          );
          cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
            testData.shadowItem.loanTypeId = res[0].id;
          });
          cy.getBookMaterialType().then((res) => {
            testData.shadowItem.materialTypeId = res.id;
          });
        })
          .then(() => {
            cy.setTenant(Affiliations.College);
            // create shadow instance with holdings and item
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.shadowInstance.instanceTypeId,
                title: testData.shadowInstance.instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.shadowHoldings.holdingTypeId,
                  permanentLocationId: testData.shadowHoldings.locationId,
                },
              ],
              items: [
                {
                  barcode: testData.shadowItem.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.shadowItem.loanTypeId },
                  materialType: { id: testData.shadowItem.materialTypeId },
                },
              ],
            }).then((specialInstanceIds) => {
              testData.shadowInstance.id = specialInstanceIds.instanceId;

              InventoryInstance.shareInstanceViaApi(
                testData.shadowInstance.id,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceById(testData.shadowInstance.id).then((instance) => {
              testData.shadowInstance.instanceHRID = instance.hrid;
            });

            cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
              user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
              cy.resetTenant();

              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.localInstance.instanceId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.shadowInstance.id);
        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.shadowInstance.id);
      });

      it(
        'C413366 (CONSORTIA) Adding Shadow child Instance to Local Instance on Member tenant (consortia) (promin)',
        { tags: ['extendedPathECS', 'promin', 'C413366'] },
        () => {
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.localInstance.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addChildInstance(testData.shadowInstance.instanceTitle);
          InstanceRecordEdit.verifyChildInstance(
            testData.shadowInstance.instanceTitle,
            testData.shadowInstance.instanceHRID,
          );
          InstanceRecordEdit.selectChildRelationshipType('bound-with');
          InstanceRecordEdit.saveAndClose();
          InteractorsTools.checkCalloutMessage(
            `The instance - HRID ${testData.localInstance.instanceHRID} has been successfully saved.`,
          );
          InstanceRecordView.verifyInstanceRecordViewOpened();
        },
      );
    });
  });
});
