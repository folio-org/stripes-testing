import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const testData = {
        tag852: '852',
        marcBibTitle: `AT_C360101_MarcBibInstance_${getRandomPostfix()}`,
        tag852Addition1: '$a Test',
        tag852Addition2: 'Updated',
      };

      let recordId;
      let user;
      let location;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({
            limit: 1,
            query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
          }).then((loc) => {
            location = loc;
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
              recordId = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.createSimpleMarcHoldingsViaAPI(
                  instanceData.id,
                  instanceData.hrid,
                  location.code,
                );
              });
            });
          });
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C360101 Verify that updates are saved after clicking "Save & keep editing" button in the editing window of "MARC Holdings" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C360101'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(
            testData.tag852,
            `$b ${location.code} ${testData.tag852Addition1}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag852,
            `$b ${location.code} ${testData.tag852Addition1}`,
          );
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.close();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag852,
            `$b ${location.code} ${testData.tag852Addition1}`,
          );

          InventoryViewSource.close();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(
            testData.tag852,
            `$b ${location.code} ${testData.tag852Addition1} ${testData.tag852Addition2}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag852,
            `$b ${location.code} ${testData.tag852Addition1} ${testData.tag852Addition2}`,
          );
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();

          InventoryInstance.goToPreviousPage();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag852,
            `$b ${location.code} ${testData.tag852Addition1} ${testData.tag852Addition2}`,
          );
        },
      );
    });
  });
});
