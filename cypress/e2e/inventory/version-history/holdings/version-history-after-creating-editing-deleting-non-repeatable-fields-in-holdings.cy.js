import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Holdings', () => {
      const testData = {
        instanceTitle: `AT_C651581_Test instance for version history ${getRandomPostfix()}`,
        locationName: LOCATION_NAMES.ANNEX_UI,
        newLocationName: LOCATION_NAMES.MAIN_LIBRARY_UI,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651581 Check "Version history" after creating,editing and deleting non- repeatable fields in Holdings (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651581'] },
        () => {
          InstanceRecordView.addHoldings();
          InventoryNewHoldings.fillPermanentLocation(testData.locationName);
          InventoryNewHoldings.saveAndClose();
          InstanceRecordView.waitLoading();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.clickCloseButton();

          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.fillHoldingFields({
            holdingType: 'Electronic',
          });
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(2);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Holdings type (Added)'],
          });
          VersionHistorySection.clickCloseButton();

          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.fillHoldingFields({
            holdingType: 'Serial',
          });
          HoldingsRecordEdit.selectTemporaryLocation(testData.locationName);
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(3);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Temporary (Added)', 'Holdings type (Edited)'],
          });
          VersionHistorySection.clickCloseButton();

          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.clearHoldingsType();
          HoldingsRecordEdit.selectTemporaryLocation(testData.newLocationName);
          HoldingsRecordEdit.chooseIllPolicy('Limited lending policy');
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(4);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Holdings type (Removed)', 'Temporary (Edited)', 'ILL policy (Added)'],
          });
          VersionHistorySection.clickCloseButton();
        },
      );
    });
  });
});
