import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instanceTitle: `C411636 Instance ${getRandomPostfix()}`,
        itemBarcode: uuid(),
      };

      before('Create test data', () => {
        cy.clearCookies({ domain: null });
        cy.getAdminToken();
        cy.getConsortiaId()
          .then((consortiaId) => {
            testData.consortiaId = consortiaId;

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              testData.holdingTypeId = res[0].id;
            });
            cy.getLocations({ limit: 1 }).then((res) => {
              testData.locationId = res.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              testData.materialTypeId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
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
                  permanentLocationId: testData.locationId,
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
            })
              .then((specialInstanceIds) => {
                testData.testInstanceIds = specialInstanceIds;
              })
              .then(() => {
                InventoryInstance.shareInstanceViaApi(
                  testData.testInstanceIds.instanceId,
                  testData.consortiaId,
                  Affiliations.College,
                  Affiliations.Consortia,
                );

                InventoryInstance.shareInstanceViaApi(
                  testData.testInstanceIds.instanceId,
                  testData.consortiaId,
                  Affiliations.College,
                  Affiliations.Consortia,
                );
                // adding Holdings in College for shared Instance
                cy.setTenant(Affiliations.College);
                const collegeLocationData = Locations.getDefaultLocation({
                  servicePointId: ServicePoints.getDefaultServicePoint().id,
                }).location;
                Locations.createViaApi(collegeLocationData).then((location) => {
                  testData.collegeLocation = location;

                  InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                    (holdingSources) => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: testData.testInstanceIds.instanceId,
                        permanentLocationId: testData.collegeLocation.id,
                        sourceId: holdingSources[0].id,
                      })
                        .then((holding) => {
                          testData.collegeHolding = holding;

                          cy.getMaterialTypes({ limit: 1 }).then((res) => {
                            testData.collegeMaterialTypeId = res.id;
                          });
                          cy.getLoanTypes({ limit: 1 }).then((res) => {
                            testData.collegeLoanTypeId = res[0].id;
                          });
                        })
                        .then(() => {
                          InventoryItems.createItemViaApi({
                            holdingsRecordId: testData.collegeHolding.id,
                            materialType: { id: testData.collegeMaterialTypeId },
                            permanentLoanType: { id: testData.collegeLoanTypeId },
                            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          }).then((item) => {
                            testData.collegeItem = item;
                          });
                        });
                    },
                  );
                });

                // adding Holdings in University for shared Instance
                cy.resetTenant();
                cy.getAdminToken();
                cy.setTenant(Affiliations.University);
                const universityLocationData = Locations.getDefaultLocation({
                  servicePointId: ServicePoints.getDefaultServicePoint().id,
                }).location;
                Locations.createViaApi(universityLocationData).then((location) => {
                  testData.universityLocation = location;

                  InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                    (holdingSources) => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: testData.testInstanceIds.instanceId,
                        permanentLocationId: testData.universityLocation.id,
                        sourceId: holdingSources[0].id,
                      })
                        .then((holding) => {
                          testData.universityHolding = holding;

                          cy.getMaterialTypes({ limit: 1 }).then((res) => {
                            testData.universityMaterialTypeId = res.id;
                          });
                          cy.getLoanTypes({ limit: 1 }).then((res) => {
                            testData.universityLoanTypeId = res[0].id;
                          });
                        })
                        .then(() => {
                          InventoryItems.createItemViaApi({
                            holdingsRecordId: testData.universityHolding.id,
                            materialType: { id: testData.universityMaterialTypeId },
                            permanentLoanType: { id: testData.universityLoanTypeId },
                            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          }).then((item) => {
                            testData.universityItem = item;
                          });
                        });
                    },
                  );
                });
              });
          });

        cy.resetTenant();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryItems.deleteItemViaApi(testData.collegeItem.id);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.collegeHolding.id);
        Locations.deleteViaApi(testData.collegeLocation);

        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.University);
        InventoryItems.deleteItemViaApi(testData.universityItem.id);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.universityHolding.id);
        Locations.deleteViaApi(testData.universityLocation);

        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      });

      it(
        'C411636 (CONSORTIA) Verify the Consortial holdings accordion details on Instance in Central Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411636'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
          InstanceRecordView.expandMemberSubHoldings('College');
          InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
            'College',
            Affiliations.College,
            testData.collegeHolding.id,
          );
          InstanceRecordView.expandMemberSubHoldings('University');
          InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
            'University',
            Affiliations.University,
            testData.universityHolding.id,
          );
        },
      );
    });
  });
});
