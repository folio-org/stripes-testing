import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
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
    const testData = {
      instanceTitle: `C411636 Instance ${getRandomPostfix()}`,
      itemBarcode: uuid(),
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.wrap()
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
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
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

            InventoryInstance.shareInstanceViaApi(
              specialInstanceIds.instanceId,
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            )
              .then(() => {
                // adding Holdings in College for shared Instance
                cy.setTenant(Affiliations.College);
                cy.getCollegeAdminToken();
                const collegeLocationData = Locations.getDefaultLocation({
                  servicePointId: ServicePoints.getDefaultServicePoint().id,
                }).location;
                Locations.createViaApi(collegeLocationData).then((location) => {
                  testData.collegeLocation = location;
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: specialInstanceIds.id,
                    permanentLocationId: testData.collegeLocation.id,
                  }).then((holding) => {
                    testData.collegeHoldings.push(holding);

                    cy.getMaterialTypes({ limit: 1 }).then((res) => {
                      testData.collegeMaterialTypeId = res.id;
                    });
                    cy.getLoanTypes({ limit: 1 }).then((res) => {
                      testData.collegeLoanTypeId = res[0].id;
                    });

                    InventoryItems.createItemViaApi({
                      holdingsRecordId: holding.id,
                      materialType: { id: testData.collegeMaterialTypeId },
                      permanentLoanType: { id: testData.collegeLoanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((item) => {
                      testData.collegeItems.push(item);
                    });
                  });
                });
              })
              .then(() => {
                // adding Holdings in University for shared Instance
                cy.setTenant(Affiliations.University);
                cy.getUniversityAdminToken();
                const universityLocationData = Locations.getDefaultLocation({
                  servicePointId: ServicePoints.getDefaultServicePoint().id,
                }).location;
                Locations.createViaApi(universityLocationData).then((location) => {
                  testData.universityLocation = location;
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: specialInstanceIds.id,
                    permanentLocationId: testData.universityLocation.id,
                  }).then((holding) => {
                    testData.universityHoldings.push(holding);

                    cy.getMaterialTypes({ limit: 1 }).then((res) => {
                      testData.universityMaterialTypeId = res.id;
                    });
                    cy.getLoanTypes({ limit: 1 }).then((res) => {
                      testData.universityLoanTypeId = res[0].id;
                    });

                    InventoryItems.createItemViaApi({
                      holdingsRecordId: holding.id,
                      materialType: { id: testData.universityMaterialTypeId },
                      permanentLoanType: { id: testData.universityLoanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((item) => {
                      testData.universityItems.push(item);
                    });
                  });
                });
              });
          });
        });

      cy.resetTenant();
      cy.getAdminToken();
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
      Users.deleteViaApi(testData.user.userId);
      cy.setTenant(Affiliations.College);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      Locations.deleteViaApi(testData.collegeLocation);

      cy.setTenant(Affiliations.College);
      cy.getCollegeAdminToken();
      testData.collegeItems.forEach((item) => {
        InventoryItems.deleteItemViaApi(item.id);
      });
      testData.collegeHoldings.forEach((holding) => {
        InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
      });
      Locations.deleteViaApi(testData.collegeLocation);

      cy.setTenant(Affiliations.University);
      cy.getUniversityAdminToken();
      testData.universityItems.forEach((item) => {
        InventoryItems.deleteItemViaApi(item.id);
      });
      testData.universityHoldings.forEach((holding) => {
        InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
      });
      Locations.deleteViaApi(testData.universityLocation);
    });

    it(
      'C411636 (CONSORTIA) Verify the Consortial holdings accordion details on Instance in Central Tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyConsortiaHoldingsAccordion(false);
        InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.verifyMemberSubHoldingsAccordion(Affiliations.College);
        InventoryInstance.verifyMemberSubHoldingsAccordion(Affiliations.University);
        InventoryInstance.expandMemberSubHoldings(Affiliations.College);
        InventoryInstance.verifyMemberSubSubHoldingsAccordion(
          Affiliations.College,
          testData.collegeHoldings[0].id,
        );
        InventoryInstance.expandMemberSubHoldings(Affiliations.University);
        InventoryInstance.verifyMemberSubSubHoldingsAccordion(
          Affiliations.University,
          testData.universityHoldings[0].id,
        );
      },
    );
  });
});
