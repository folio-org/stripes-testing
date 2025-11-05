import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        shadowInstance: {
          instanceTitle: `C411685 Autotest Instance ${getRandomPostfix()}`,
        },
        shadowHoldings: {},
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College)
            .then(() => {
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                testData.shadowInstance.instanceTypeId = instanceTypes[0].id;
              });
              cy.getHoldingTypes({ limit: 1 }).then((res) => {
                testData.shadowHoldings.holdingTypeId = res[0].id;
              });
              cy.getLocations({ limit: 1 }).then((res) => {
                testData.shadowHoldings.locationId = res.id;
                testData.shadowHoldings.locationName = res.name;
              });
            })
            .then(() => {
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
                items: [],
              }).then((specialInstanceIds) => {
                testData.testInstanceIds = specialInstanceIds;

                InventoryInstance.shareInstanceViaApi(
                  specialInstanceIds.instanceId,
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

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete test data', () => {
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
        });
        cy.withinTenant(Affiliations.College, () => {
          cy.deleteHoldingRecordViaApi(testData.testInstanceIds.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(testData.testInstanceIds.instanceId);
        });
      });

      it(
        'C411685 (CONSORTIA) Verify that the Add holdings button is not available in the Consortial accordion on Central tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411685'] },
        () => {
          InventoryInstances.searchByTitle(testData.testInstanceIds.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(
            testData.testInstanceIds.instanceId,
            false,
          );
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
          InstanceRecordView.verifyIsHoldingsCreated([`${testData.shadowHoldings.locationName}`]);
          InstanceRecordView.verifyAddHoldingsButtonIsAbsent();
        },
      );
    });
  });
});
