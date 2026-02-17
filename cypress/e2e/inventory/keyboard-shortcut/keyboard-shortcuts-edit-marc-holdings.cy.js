import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHotkeys from '../../../support/fragments/inventory/inventoryHotkeys';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const testData = {
      instanceTitle: `AT_C476706_MarcBibInstance_${getRandomPostfix()}`,
      tag866Value: 'Tag866 value',
      tag008: '008',
      tag004: '004',
      tag245: '245',
      tag852: '852',
      tag866: '866',
    };
    const updatedTag866Value = `${testData.tag866Value} UPD`;
    const marcInstanceFields = [
      {
        tag: testData.tag008,
        content: QuickMarcEditor.valid008ValuesInstance,
      },
      {
        tag: testData.tag245,
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '1'],
      },
    ];
    const paneHeaderEditRecord = 'Edit MARC holdings';
    let createdInstanceId;
    let location;
    let user;

    before('Creating data', () => {
      cy.then(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          Permissions.uiInventoryViewCreateEditHoldings.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((loc) => {
          location = loc;
        });
      })
        .then(() => {
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.getInstanceById(createdInstanceId).then((instanceData) => {
              cy.createMarcHoldingsViaAPI(createdInstanceId, [
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
        })
        .then(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.instanceTabIsDefault();
        });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
    });

    it(
      'C476706 Windows | "Edit MARC holdings" page is opened when user with edit permission uses shortcut "Ctrl + Shift + E" on the detail view pane of "MARC holdings" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C476706'] },
      () => {
        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.waitInstanceRecordViewOpened();

        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkActionsButtonShown();

        InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.editMarc);
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkPaneheaderContains(paneHeaderEditRecord);

        QuickMarcEditor.updateExistingField(testData.tag866, `$a ${updatedTag866Value}`);

        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.checkHoldingsStatement(updatedTag866Value);
      },
    );
  });
});
