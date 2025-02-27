import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Holdings', () => {
    const testData = {
      instance: {},
      user: {},
      holdings: {},
    };
    const userPermissions = [
      Permissions.inventoryAll.gui,
      Permissions.uiInventoryUpdateOwnership.gui,
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.withinTenant(Affiliations.College, () => {
        InventoryInstance.createInstanceViaApi()
          .then(({ instanceData }) => {
            testData.instance = instanceData;

            cy.getLocations({ query: 'name="DCB"' }).then((res) => {
              testData.holdings.locationId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdings.sourceId = folioSource.id;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.holdings.locationId,
              sourceId: testData.holdings.sourceId,
            }).then((holding) => {
              testData.holdings = holding;

              InventoryInstance.shareInstanceViaApi(
                testData.instance.instanceId,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
          });
      });
      cy.withinTenant(Affiliations.University, () => {
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
          (servicePoints) => {
            testData.servicePointId = servicePoints[0].id;

            testData.defaultLocation = Locations.getDefaultLocation({
              servicePointId: testData.servicePointId,
            }).location;
            Locations.createViaApi(testData.defaultLocation);
          },
        );
      });

      cy.createTempUser(userPermissions).then((userProperties) => {
        testData.user = userProperties;

        [Affiliations.College, Affiliations.University].forEach((affiliation) => {
          cy.affiliateUserToTenant({
            tenantId: affiliation,
            userId: testData.user.userId,
            permissions: userPermissions,
          });
        });

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      cy.withinTenant(Affiliations.College, () => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      });
      cy.withinTenant(Affiliations.University, () => {
        Locations.deleteViaApi(testData.collegeLocation);
      });
    });

    it(
      'C490891 Check "Update ownership" option in Holdings option menu (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C490891'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.validateOptionInActionsMenu([
          { optionName: 'Update ownership', shouldExist: true },
        ]);
        ['cancel', 'confirm'].forEach((action) => {
          HoldingsRecordView.updateOwnership(
            tenantNames.university,
            action,
            testData.holdings.hrid,
            tenantNames.college,
          );
        });
        InstanceRecordView.waitLoading();
        InventoryInstance.verifyConsortiaHoldingsAccordion(false);
        InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.verifyMemberSubHoldingsAccordionAbsent(Affiliations.College);
        InventoryInstance.verifyMemberSubHoldingsAccordion(Affiliations.University);
        InventoryInstance.expandMemberSubHoldings(Affiliations.University);
        InventoryInstance.openHoldingsAccordion(testData.defaultLocation.name);
      },
    );
  });
});
