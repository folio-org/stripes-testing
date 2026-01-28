import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        marcBibTitle: 'The title: the face of a record',
        tags: {
          tag008: '008',
          tag245: '245',
          tag246: '246',
          tagLDR: 'LDR',
        },
        fieldContents: {
          tag245Content: 'New title',
        },
        error06and07Filed:
          'Record cannot be saved. Please enter a valid Leader 06 and Leader 07. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
        error07Filed:
          'Record cannot be saved. Please enter a valid Leader 07. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
        errorMultipleTags: 'Field is non-repeatable.',
      };
      const field008DropdownsOptionsSets = [
        { name: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST, option: 'm - Multiple dates' },
        { name: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.COMP, option: 'an - Anthems' },
        { name: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FMUS, option: 'a - Full score' },
      ];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
        });
      });

      beforeEach('Create test data', () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C422112 Creating a new "MARC bib" record with invalid LDR positions 06, 07 values (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C422112'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.updateExistingField('245', `$a ${testData.marcBibTitle}`);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(0, testData.error06and07Filed);

          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.C,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tags.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.C,
          );

          field008DropdownsOptionsSets.forEach((field008DropdownOption) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tags.tag008,
              field008DropdownOption.name,
              field008DropdownOption.option,
            );
          });

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(0, testData.error07Filed);
        },
      );

      it(
        'C422117 "245" field presence validation when creating a new "MARC bib" record (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C422117'] },
        () => {
          InventoryInstance.newMarcBibRecord();

          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.updateExistingTagName(testData.tags.tag245, testData.tags.tag246);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout('Field 245 is required.');

          QuickMarcEditor.updateExistingTagName(testData.tags.tag246, testData.tags.tag245);
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            `$a ${testData.fieldContents.tag245Content}`,
          );

          MarcAuthority.addNewField(
            4,
            testData.tags.tag245,
            `$a ${testData.fieldContents.tag245Content}`,
          );

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errorMultipleTags);
          InventoryInstance.verifyNewQuickMarcEditorPaneExists();
        },
      );
    });
  });
});
