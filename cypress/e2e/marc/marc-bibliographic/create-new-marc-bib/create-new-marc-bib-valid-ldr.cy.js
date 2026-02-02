import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
  INVENTORY_LDR_FIELD_CTRL_DROPDOWN,
  INVENTORY_LDR_FIELD_DESC_DROPDOWN,
  INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const createdInstanceIDs = [];
      let user;
      const elvlBoxValues = ['P', 'n', '8', '$'];
      const tagLDR = 'LDR';
      const statusDropdownOptions = Object.values(INVENTORY_LDR_FIELD_STATUS_DROPDOWN);
      const ctrlDropdownOptions = Object.values(INVENTORY_LDR_FIELD_CTRL_DROPDOWN);
      const descDropdownOptions = Object.values(INVENTORY_LDR_FIELD_DESC_DROPDOWN);
      const multilvlDropdownOptions = Object.values(INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN);
      const LDRDropdownOptionSets = [
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          options: statusDropdownOptions,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.CTRL,
          options: ctrlDropdownOptions,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.DESC,
          options: descDropdownOptions,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.MULTILVL,
          options: multilvlDropdownOptions,
        },
      ];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          createdInstanceIDs.forEach((instanceID) => {
            InventoryInstance.deleteInstanceViaApi(instanceID);
          });
        });
      });

      it(
        'C422111 Creating a new "MARC bib" record with valid LDR values in positions 05, 08, 17, 18, 19 (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C422111'] },
        () => {
          for (let i = 0; i < descDropdownOptions.length; i++) {
            const title = getRandomPostfix();

            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.updateExistingField('245', `$a ${title}`);

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              LDRDropdownOptionSet.options.forEach((dropdownOption) => {
                QuickMarcEditor.verifyFieldsDropdownOption(
                  tagLDR,
                  LDRDropdownOptionSet.name,
                  dropdownOption,
                );
              });
            });

            QuickMarcEditor.updateLDR06And07Positions();

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.selectFieldsDropdownOption(
                tagLDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });
            QuickMarcEditor.fillInElvlBoxInLDRField(elvlBoxValues[i % elvlBoxValues.length]);
            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.verifyDropdownOptionChecked(
                tagLDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });
            cy.wait(1000);
            QuickMarcEditor.verifyValueInElvlBoxInLDRField(elvlBoxValues[i % elvlBoxValues.length]);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.waitInventoryLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdInstanceIDs);
            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.verifyDropdownOptionChecked(
                tagLDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });
            QuickMarcEditor.verifyValueInElvlBoxInLDRField(elvlBoxValues[i % elvlBoxValues.length]);

            QuickMarcEditor.closeWithoutSaving();
          }
        },
      );
    });
  });
});
