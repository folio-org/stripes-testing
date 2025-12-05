import uuid from 'uuid';
import { calloutTypes } from '../../../../../interactors';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/item/itemRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MaterialTypes from '../../../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        materialTypeName: `AT_C648468_MaterialType_${getRandomPostfix()}`,
        instance: {
          title: `C648468 Autotest Instance ${getRandomPostfix()}`,
          typeId: '',
        },
        colledgeHoldings: {},
        collegeItem: { barcode: uuid() },
        universityHoldings: {},
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
                testData.colledgeHoldings.holdingTypeId = res[0].id;
              });
              ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
                const collegeLocationData = Locations.getDefaultLocation({
                  servicePointId: servicePoint.id,
                }).location;
                Locations.createViaApi(collegeLocationData).then((location) => {
                  testData.colledgeHoldings.location = location;
                  testData.colledgeHoldings.locationId = location.id;
                  testData.colledgeHoldings.locationName = location.name;
                });
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.collegeItem.loanTypeId = res[0].id;
              });
              MaterialTypes.createMaterialTypeViaApi({
                name: testData.materialTypeName,
              }).then(({ body }) => {
                testData.collegeItem.materialTypeId = body.id;
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                testData.colledgeHoldings.sourceId = folioSource.id;
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instance.instanceTypeId,
                  title: testData.instance.instanceTitle,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.colledgeHoldings.holdingTypeId,
                    permanentLocationId: testData.colledgeHoldings.locationId,
                  },
                ],
                items: [
                  {
                    barcode: testData.collegeItem.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.collegeItem.loanTypeId },
                    materialType: { id: testData.collegeItem.materialTypeId },
                  },
                ],
              })
                .then((specialInstanceIds) => {
                  testData.instance.id = specialInstanceIds.instanceId;
                  testData.colledgeHoldings.id = specialInstanceIds.holdingIds[0].id;
                  testData.collegeItem.id = specialInstanceIds.items[0].id;

                  InventoryInstance.shareInstanceViaApi(
                    testData.instance.id,
                    testData.consortiaId,
                    Affiliations.College,
                    Affiliations.Consortia,
                  );
                })
                .then(() => {
                  cy.withinTenant(Affiliations.University, () => {
                    ServicePoints.getCircDesk1ServicePointViaApi()
                      .then((servicePoint) => {
                        const universityLocationData = Locations.getDefaultLocation({
                          servicePointId: servicePoint.id,
                        }).location;
                        Locations.createViaApi(universityLocationData).then((location) => {
                          testData.universityHoldings.location = location;
                          testData.universityHoldings.locationId = location.id;
                          testData.universityHoldings.locationName = location.name;
                        });
                        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                          testData.universityHoldings.sourceId = folioSource.id;
                        });
                      })
                      .then(() => {
                        InventoryHoldings.createHoldingRecordViaApi({
                          instanceId: testData.instance.id,
                          permanentLocationId: testData.universityHoldings.locationId,
                          sourceId: testData.universityHoldings.sourceId,
                        }).then((holding) => {
                          testData.universityHoldings.holdings = holding;
                        });
                      });
                  });
                });
            });
        });
        cy.resetTenant();

        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory, CapabilitySets.uiConsortiaInventoryUpdateOwnershipItem],
          );
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory, CapabilitySets.uiConsortiaInventoryUpdateOwnershipItem],
          );
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.id);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryItems.deleteItemViaApi(testData.collegeItem.id);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.colledgeHoldings.id);
        Locations.deleteViaApi(testData.colledgeHoldings.location);
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.University);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.universityHoldings.holdings.id);
        Locations.deleteViaApi(testData.universityHoldings.location);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.id);
      });

      it(
        'C648468 (CONSORTIA) Item - Update Ownership action displays failure message when Item contains Local reference data (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C648468'] },
        () => {
          InstanceRecordView.openHoldingItem({
            name: testData.colledgeHoldings.locationName,
            barcode: testData.collegeItem.barcode,
          });
          ItemRecordView.validateOptionInActionsMenu([
            { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
          ]);
          ItemRecordView.updateOwnership(
            tenantNames.university,
            testData.universityHoldings.locationName,
          );
          InteractorsTools.checkCalloutMessage(
            'Item ownership could not be updated because the record contains local-specific reference data.',
            calloutTypes.error,
          );
        },
      );
    });
  });
});
