import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
// import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
// import HoldingsRecordView, {
//   actionsMenuOptions,
// } from '../../../../support/fragments/inventory/holdingsRecordView';
// import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
// import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
// import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      user: {},
      collegeInstance: {
        name: `AT_C553015_Instance${getRandomPostfix}`,
        itemBarcode: uuid(),
      },
      universityInstance: {
        name: `AT_C553015_Instance${getRandomPostfix}`,
        itemBarcode: uuid(),
      },
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
        testData.collegeInstance.instanceId = InventoryInstances.createInstanceViaApi(
          testData.collegeInstance.name,
          testData.collegeInstance.itemBarcode,
        );
        InventoryInstance.shareInstanceViaApi(
          testData.collegeInstance.instanceId,
          testData.consortiaId,
          Affiliations.College,
          Affiliations.Consortia,
        );
      });
      cy.withinTenant(Affiliations.University, () => {
        testData.universityInstance.instanceId = InventoryInstances.createInstanceViaApi(
          testData.universityInstance.name,
          testData.universityInstance.itemBarcode,
        );
        InventoryInstance.shareInstanceViaApi(
          testData.universityInstance.instanceId,
          testData.consortiaId,
          Affiliations.University,
          Affiliations.Consortia,
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

    // after('Delete test data', () => {
    //   cy.resetTenant();
    //   cy.getAdminToken();
    //   Users.deleteViaApi(testData.user.userId);
    //   cy.withinTenant(Affiliations.University, () => {
    //     cy.deleteHoldingRecordViaApi(testData.holdings.id);
    //     InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    //     Locations.deleteViaApi(testData.location);
    //   });
    // });

    it(
      'C553015 Check "Update ownership" option in Item option menu (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C553015'] },
      () => {
        // InventoryInstances.searchByTitle(testData.instance.instanceId);
        // InventoryInstances.selectInstance();
        // InstanceRecordView.waitLoading();
        // InstanceRecordView.openHoldingView();
        // HoldingsRecordView.checkHoldingRecordViewOpened();
        // HoldingsRecordView.validateOptionInActionsMenu([
        //   { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
        // ]);
        // ['cancel', 'confirm'].forEach((action) => {
        //   HoldingsRecordView.updateOwnership(
        //     tenantNames.university,
        //     action,
        //     testData.holdings.hrid,
        //     tenantNames.college,
        //     testData.location.name,
        //   );
        // });
        // InstanceRecordView.waitLoading();
        // InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
        // InstanceRecordView.expandConsortiaHoldings();
        // InstanceRecordView.verifyMemberSubHoldingsAccordionAbsent(Affiliations.College);
        // InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
        // InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
        // InstanceRecordView.verifyIsHoldingsCreated([`${testData.location.name} >`]);
      },
    );
  });
});
