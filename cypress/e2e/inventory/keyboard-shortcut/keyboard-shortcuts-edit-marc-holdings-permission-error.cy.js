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
import InteractorsTools from '../../../support/utils/interactorsTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const testData = {
      instanceTitle: `AT_C476710_MarcBibInstance_${getRandomPostfix()}`,
      tag008: '008',
      tag004: '004',
      tag245: '245',
      tag852: '852',
    };
    const permissionCalloutText = 'You do not have permission to edit the record.';
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
    let userC476710;
    let userC476711;

    before('Creating data', () => {
      cy.then(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
        ]).then((createdUserProperties) => {
          userC476710 = createdUserProperties;
        });
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
        ]).then((createdUserProperties) => {
          userC476711 = createdUserProperties;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((loc) => {
          location = loc;
        });
      }).then(() => {
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
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
              ]);
            });
          },
        );
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userC476710.userId);
      Users.deleteViaApi(userC476711.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
    });

    it(
      'C476710 Windows | Permission error is shown when user without edit permission uses shortcut "Ctrl + Shift + E" on the the detail view pane of "MARC Holdings" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C476710'] },
      () => {
        cy.login(userC476710.username, userC476710.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();

        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.waitInstanceRecordViewOpened();

        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkActionsButtonShown();

        InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.editMarc);
        InteractorsTools.checkCalloutErrorMessage(permissionCalloutText);
        HoldingsRecordView.waitLoading();
      },
    );

    it(
      'C476711 Windows | Permission error is shown when user without edit permission uses shortcut "Ctrl + Shift + E" on the view source pane of "MARC holdings" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C476711'] },
      () => {
        cy.login(userC476711.username, userC476711.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();

        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.waitInstanceRecordViewOpened();

        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkActionsButtonShown();

        HoldingsRecordView.viewSource();
        InventoryViewSource.checkActionsButtonEnabled();

        InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.editMarc);
        InteractorsTools.checkCalloutErrorMessage(permissionCalloutText);
        InventoryViewSource.waitHoldingLoading();
      },
    );
  });
});
