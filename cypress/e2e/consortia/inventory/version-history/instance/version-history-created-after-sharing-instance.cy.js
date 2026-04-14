import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import Permissions from '../../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../../../support/fragments/inventory/inventoryNewInstance';
import VersionHistorySection from '../../../../../support/fragments/inventory/versionHistorySection';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version History', () => {
    describe('Instance', () => {
      describe('Consortia', () => {
        const testData = {
          instanceTitle: `AT_C655272_InstanceTitle_${getRandomPostfix()}`,
          date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        };

        before('Create test data', () => {
          cy.getAdminToken();
          cy.createTempUser([]).then((userProperties) => {
            testData.user = userProperties;

            cy.assignCapabilitiesToExistingUser(
              testData.user.userId,
              [],
              [CapabilitySets.uiInventory],
            );
            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: testData.user.userId,
              permissions: [
                Permissions.inventoryAll.gui,
                Permissions.consortiaInventoryShareLocalInstance.gui,
              ],
            });

            cy.withinTenant(Affiliations.College, () => {
              cy.getStatisticalCodes({
                limit: 1,
                query: 'code=="rmusic"',
              }).then((response) => {
                testData.statisticalCode = `ARL (Collection stats):    ${response[0].code} - ${response[0].name}`;
              });
            });

            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          InventoryInstance.deleteInstanceViaApi(testData.instanceId);
          Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C655272 Check that "Version history" is cleared after sharing instance (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C655272'] },
          () => {
            InventoryInstances.addNewInventory();
            InventoryNewInstance.fillResourceTitle(testData.instanceTitle);
            InventoryNewInstance.fillResourceType();
            InventoryNewInstance.clickSaveAndCloseButton();
            InventoryInstance.waitLoading();
            InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
            InstanceRecordView.verifyInstanceRecordViewOpened();
            InstanceRecordView.clickVersionHistoryButton();
            InstanceRecordView.checkButtonsStateWhenVersionHistoryPaneIsOpen();
            VersionHistorySection.verifyOriginalVersionCard({
              index: 0,
              firstName: testData.user.firstName,
              lastName: testData.user.lastName,
            });
            VersionHistorySection.clickCloseButton();
            InstanceRecordView.edit();
            InstanceRecordEdit.waitLoading();
            InstanceRecordEdit.addStatisticalCode(testData.statisticalCode);
            InstanceRecordEdit.clickSaveAndCloseButton();
            InstanceRecordView.waitLoading();
            InstanceRecordView.verifyInstanceRecordViewOpened();
            InstanceRecordView.clickVersionHistoryButton();
            InstanceRecordView.checkButtonsStateWhenVersionHistoryPaneIsOpen();
            VersionHistorySection.verifyCurrentVersionCard({
              index: 0,
              firstName: testData.user.firstName,
              lastName: testData.user.lastName,
              changes: ['Statistical codes (Added)'],
            });
            VersionHistorySection.clickCloseButton();
            InstanceRecordView.verifyInstanceRecordViewOpened();
            cy.wait(5000);
            InventoryInstance.clickShareLocalInstanceButton();
            InventoryInstance.clickShareInstance();
            InventoryInstance.verifyCalloutMessage(
              `Local instance ${testData.instanceTitle} has been successfully shared`,
            );
            InstanceRecordView.verifyInstanceRecordViewOpened();
            InventoryInstance.getId().then((id) => {
              testData.instanceId = id;
            });
            InstanceRecordView.clickVersionHistoryButton();
            VersionHistorySection.verifyOriginalVersionCard({
              index: 0,
              firstName: testData.user.firstName,
              lastName: testData.user.lastName,
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(testData.instanceTitle);
            InventoryInstances.selectInstance();
            InstanceRecordView.verifyInstanceRecordViewOpened();
            InstanceRecordView.clickVersionHistoryButton();
            VersionHistorySection.verifySharedVersionCard({
              index: 0,
              firstName: testData.user.firstName,
              lastName: testData.user.lastName,
            });
          },
        );
      });
    });
  });
});
