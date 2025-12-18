import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      const testData = {
        shadowInstance: {
          instanceTitle: `C413370 Autotest Instance ${getRandomPostfix()}`,
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
          });
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.shadowInstance.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.shadowHoldings.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
            testData.shadowHoldings.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.shadowItem.loanTypeId = res[0].id;
          });
          cy.getBookMaterialType().then((res) => {
            testData.shadowItem.materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            testData.sourceId = folioSource.id;
          });
        }).then(() => {
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
                sourceId: testData.sourceId,
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

            cy.getInstanceById(specialInstanceIds.instanceId).then((instance) => {
              testData.shadowInstance.instanceHRID = instance.hrid;
            });
            cy.setTenant(Affiliations.College);
            InventoryInstance.shareInstanceViaApi(
              testData.shadowInstance.id,
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            );
          });
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
          cy.resetTenant();

          cy.login(user.username, user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.shadowInstance.id);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.localInstance.instanceId);
      });

      it(
        'C413370 (CONSORTIA) Adding Shadow parent Instance to Local Instance on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C413370'] },
        () => {
          InventoryInstances.searchByTitle(testData.localInstance.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addParentInstance(testData.shadowInstance.instanceTitle);

          InstanceRecordEdit.verifyParentInstance(
            testData.shadowInstance.instanceTitle,
            testData.shadowInstance.instanceHRID,
          );
          InstanceRecordEdit.selectParentRelationshipType('bound-with');
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordEdit.verifyShareParentLinkingError();
        },
      );
    });
  });
});
