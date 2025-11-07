import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tag004: '004',
      tag008: '008',
      tag852: '852',
      tag866: '866',
      tag867: '867',
      marcBibTitle: `AT_C345391_MarcBibInstance_${getRandomPostfix()}`,
      tag866Value: 'Field866',
      tag867Value: 'Field867',
    };

    let recordId;

    before('Creating user, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
          (location) => {
            // create MARC instance with Holding and without Items
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
              recordId = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.createMarcHoldingsViaAPI(instanceData.id, [
                  {
                    content: instanceData.hrid,
                    tag: testData.tag004,
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: testData.tag008,
                  },
                  {
                    content: `$b ${location.code}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag852,
                  },
                  {
                    content: `$a ${testData.tag866Value}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag866,
                  },
                  {
                    content: `$a ${testData.tag867Value}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag867,
                  },
                ]);
              });
            });
          },
        );
      }).then(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((tempUser) => {
          testData.tempUser = tempUser;

          cy.login(tempUser.username, tempUser.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.tempUser.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
    });

    it(
      'C345391 MARC holdings record: Remove multiple MARC tags (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C345391'] },
      () => {
        InventoryInstances.searchByTitle(recordId);
        InventoryInstances.selectInstanceById(recordId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.deleteField(6);
        QuickMarcEditor.afterDeleteNotification(testData.tag866);
        QuickMarcEditor.checkTagAbsent(testData.tag866);

        QuickMarcEditor.deleteField(7);
        QuickMarcEditor.afterDeleteNotification(testData.tag867);
        QuickMarcEditor.checkTagAbsent(testData.tag867);

        QuickMarcEditor.clickSaveAndKeepEditingButton();
        QuickMarcEditor.deleteConfirmationPresented();
        QuickMarcEditor.confirmDelete();
        QuickMarcEditor.checkNoDeletePlaceholder();

        QuickMarcEditor.pressCancel();
        HoldingsRecordView.waitLoading();

        HoldingsRecordView.checkHoldingsStatementAbsent(testData.tag866Value);

        HoldingsRecordView.viewSource();
        InventoryViewSource.notContains(`${testData.tag866}\t`);
        InventoryViewSource.notContains(`${testData.tag867}\t`);
      },
    );
  });
});
