import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/holdingsRecordView';
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
        ServicePoints.getCircDesk1ServicePointViaApi().then(
          (servicePoint) => {
            testData.location = Locations.getDefaultLocation({
              servicePointId: servicePoint.id,
            }).location;
            Locations.createViaApi(testData.location).then((location) => {
              testData.location.id = location.id;
            });
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

        cy.resetTenant();
        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    after('Delete test data', () => {
      cy.withinTenant(Affiliations.University, () => {
        cy.deleteHoldingRecordViaApi(testData.holdings.id);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        Locations.deleteViaApi(testData.location);
      });
      cy.withinTenant(Affiliations.Consortia, () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
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
          { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
        ]);
        ['cancel', 'confirm'].forEach((action) => {
          HoldingsRecordView.updateOwnership(
            tenantNames.university,
            action,
            testData.holdings.hrid,
            tenantNames.college,
            testData.location.name,
          );
        });
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
        InstanceRecordView.expandConsortiaHoldings();
        InstanceRecordView.verifyMemberSubHoldingsAccordionAbsent(Affiliations.College);
        InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
        InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
        InstanceRecordView.verifyIsHoldingsCreated([`${testData.location.name} >`]);
      },
    );
  });
});
