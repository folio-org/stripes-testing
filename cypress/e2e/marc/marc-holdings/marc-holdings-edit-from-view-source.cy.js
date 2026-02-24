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
        tag004: '004',
        tag008: '008',
        tag852: '852',
        tag866: '866',
        marcBibTitle: `AT_C543800_MarcBibInstance_${getRandomPostfix()}`,
        tag866Value: 'Field866',
        tag866UpdatedValue: 'Field866 - Updated',
      };

      let recordId;
      let user;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (location) => {
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
                  ]);
                });
              });
            },
          );
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C543800 Edit "MARC holdings" record from "View source" pane in "Inventory" app (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C543800'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.viewSource();
          InventoryViewSource.checkActionsButtonEnabled();
          InventoryViewSource.validateOptionsInActionsMenu({
            edit: true,
            print: true,
            quickExport: false,
          });

          InventoryViewSource.editMarcBibRecord();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(testData.tag866, `$a ${testData.tag866UpdatedValue}`);
          QuickMarcEditor.checkContentByTag(testData.tag866, `$a ${testData.tag866UpdatedValue}`);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.viewSource();
          InventoryViewSource.editMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.pressCancel();
          HoldingsRecordView.waitLoading();
        },
      );
    });
  });
});
