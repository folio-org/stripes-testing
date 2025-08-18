import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
// import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
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
// import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Holdings', () => {
    const testData = {
      instance: {},
      user: {},
      holdings: {},
    };
    const instanceMarc = {
      instanceTitle: `C435917 first marc instance-${getRandomPostfix()}`,
    };
    const userPermissions = [
      Permissions.inventoryAll.gui,
      Permissions.uiInventoryUpdateOwnership.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.withinTenant(Affiliations.College, () => {
        // create MARC instance with Holding
        cy.wrap()
          .then(() => {
            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
              testData.location = res;
            });
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(instanceMarc.instanceTitle).then((instanceId) => {
              instanceMarc.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                instanceMarc.hrid = instanceData.hrid;

                cy.createSimpleMarcHoldingsViaAPI(
                  instanceData.id,
                  instanceData.hrid,
                  testData.location.code,
                );
              });

              InventoryInstance.shareInstanceViaApi(
                instanceMarc.uuid,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
          });
      });
      cy.withinTenant(Affiliations.University, () => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
          testData.location = Locations.getDefaultLocation({
            servicePointId: servicePoint.id,
          }).location;
          Locations.createViaApi(testData.location).then((location) => {
            testData.location.id = location.id;
          });
        });
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryUpdateOwnership.gui,
      ]).then((userProperties) => {
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

    // after('Delete test data', () => {
    //   cy.withinTenant(Affiliations.University, () => {
    //     cy.deleteHoldingRecordViaApi(testData.holdings.id);
    //     InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    //     Locations.deleteViaApi(testData.location);
    //   });
    //   cy.withinTenant(Affiliations.Consortia, () => {
    //     cy.getAdminToken();
    //     Users.deleteViaApi(testData.user.userId);
    //   });
    // });

    it(
      'C788750 Update ownership of MARC holdings record which belongs to Shared MARC bib (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C788750'] },
      () => {
        InventoryInstances.searchByTitle(instanceMarc.uuid);
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
        InstanceRecordView.editMarcBibliographicRecord();
      },
    );
  });
});
