import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C663247_MarcBibInstance_${randomPostfix}`,
        tag245: '245',
        valid245IndicatorValue: '1',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      };
      const permissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C663247');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminUserDetails().then((user) => {
            testData.lastName = user.personal.lastName;
            testData.firstName = user.personal.firstName;
          });

          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin();
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
          });
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.verifySaveAndCloseButtonEnabled(false);
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.valid245IndicatorValue, 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.valid245IndicatorValue, 1);
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.instanceTitle);

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
          }, 20_000);
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
          InventoryInstance.checkInstanceTitle(testData.instanceTitle);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C663247 "Version history" pane is displayed on "View source" pane of "MARC bibliographic" records created via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C663247'] },
        () => {
          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane();
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.firstName,
            testData.lastName,
            true,
          );
          VersionHistorySection.clickCloseButton();
          InventoryViewSource.waitLoading();
          InventoryViewSource.checkActionsButtonEnabled(true);
        },
      );
    });
  });
});
