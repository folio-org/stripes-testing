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
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Holdings', () => {
    const testData = {
      instance: {},
      user: {},
      holdings: {},
    };

    before('Create test data', () => {
      cy.getAdminToken();
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
            });
          });
      });

      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        [Affiliations.College, Affiliations.University].forEach((affiliation) => {
          cy.affiliateUserToTenant({
            tenantId: affiliation,
            userId: testData.user.userId,
            permissions: [Permissions.inventoryAll.gui],
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
      cy.withinTenant(Affiliations.College, () => {
        cy.deleteHoldingRecordViaApi(testData.holdings.id);
      });
      cy.withinTenant(Affiliations.Consortia, () => {
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C476823 "Update ownership" option is not displayed on Local Instance Holdings menu (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C476823'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.validateOptionInActionsMenu([
          { optionName: actionsMenuOptions.updateOwnership, shouldExist: false },
        ]);
      },
    );
  });
});
