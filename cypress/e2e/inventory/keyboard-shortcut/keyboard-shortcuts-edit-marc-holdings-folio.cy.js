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
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const testData = {
      instanceTitle: `AT_C476707_MarcBibInstance_${getRandomPostfix()}`,
      tag008: '008',
      tag245: '245',
    };
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
    let createdInstanceId;
    let location;
    let holdingsSourceId;
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
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          holdingsSourceId = folioSource.id;
        });
      })
        .then(() => {
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            createdInstanceId = instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: createdInstanceId,
              permanentLocationId: location.id,
              sourceId: holdingsSourceId,
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
      'C476707 Windows | Nothing happens when user with edit permission uses shortcut "Ctrl + Shift + E" on the detail view pane of "Holdings" record with source = "FOLIO" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C476707'] },
      () => {
        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.waitInstanceRecordViewOpened();

        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkActionsButtonShown();

        InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.editMarc);
        cy.wait(5000); // wait to be sure that QuickMarc window has not been opened
        HoldingsRecordView.checkHoldingRecordViewOpened();
      },
    );
  });
});
