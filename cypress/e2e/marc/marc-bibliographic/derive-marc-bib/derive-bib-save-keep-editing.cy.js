import getRandomPostfix from '../../../../support/utils/stringTools';
import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const title = `AT_C709270_MarcBibInstance_${getRandomPostfix()}`;
      const tags = {
        tag008: '008',
        tag245: '245',
        invalidTag: '24',
      };
      const updatedTitle = `${title} UPD`;
      const errorPrefix = 'Fail:';
      const new245IndicatorValues = ['\\', '1'];

      const marcInstanceFields = [
        {
          tag: '008',
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: '245',
          content: `$a ${title}`,
          indicators: ['1', '1'],
        },
      ];

      let userProperties;
      let createdInstanceId;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(title);
      });

      it(
        'C709270 Derive MARC bib record with using "Save & keep editing" button (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C709270'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkDerivePaneheader();
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.updateIndicatorValue(tags.tag245, new245IndicatorValues[0], 0);
          QuickMarcEditor.updateIndicatorValue(tags.tag245, new245IndicatorValues[1], 1);
          QuickMarcEditor.updateExistingField(tags.tag245, `$a ${updatedTitle}`);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.updateExistingTagName(tags.tag245, tags.invalidTag);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(4, errorPrefix);
          QuickMarcEditor.verifyValidationCallout(0, 2);
          QuickMarcEditor.verifyNo245TagCallout();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.B,
          );
          QuickMarcEditor.updateExistingTagName(tags.invalidTag, tags.tag245);

          QuickMarcEditor.clickSaveAndKeepEditingButton();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditingDerive();
          QuickMarcEditor.checkPaneheaderContains(/edit/i);
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkUserNameInHeader(userProperties.firstName, userProperties.lastName);
        },
      );
    });
  });
});
