import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tags: {
          tag245: '245',
          tagLDR: 'LDR',
          tag0: '0',
          tag10: '10',
          tagABC: 'abc',
          tag100: '100',
        },
        fieldContents: {
          tag0: '$a something',
          tag245: 'A new title',
          tagLDRElvlBox: 'u',
          tagLDRElvlBoxEmpty: '',
        },
        errors: {
          tagCharacterLength: 'Tag must contain three characters and can only accept numbers 0-9.',
        },
      };

      let userData;
      let createdInstanceRecordId;

      before(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((createdUserProperties) => {
          userData = createdUserProperties;

          cy.login(userData.username, userData.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceRecordId);
      });

      it(
        'C422118 Tag and LDR validation when creating a new "MARC bib" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C422118'] },
        () => {
          InventoryInstance.newMarcBibRecord();

          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tags.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tags.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          );
          QuickMarcEditor.checkSubfieldsPresenceInTag008();

          QuickMarcEditor.check008FieldContent();
          QuickMarcEditor.fillInElvlBoxInLDRField(testData.fieldContents.tagLDRElvlBoxEmpty);
          QuickMarcEditor.verifyValueInElvlBoxInLDRField(testData.fieldContents.tagLDRElvlBoxEmpty);
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            `$a ${testData.fieldContents.tag245}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tags.tag245,
            `$a ${testData.fieldContents.tag245}`,
          );

          QuickMarcEditor.fillInElvlBoxInLDRField(testData.fieldContents.tagLDRElvlBox);
          QuickMarcEditor.verifyValueInElvlBoxInLDRField(testData.fieldContents.tagLDRElvlBox);

          MarcAuthority.addNewField(4, testData.tags.tag0, testData.fieldContents.tag0);
          QuickMarcEditor.verifyTagFieldAfterUnlinking(
            5,
            '0',
            '\\',
            '\\',
            testData.fieldContents.tag0,
          );

          QuickMarcEditor.updateExistingTagValue(5, '');
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errors.tagCharacterLength);

          QuickMarcEditor.updateExistingTagValue(5, testData.tags.tag10);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errors.tagCharacterLength);

          QuickMarcEditor.updateExistingTagValue(5, testData.tags.tagABC);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errors.tagCharacterLength);

          QuickMarcEditor.updateExistingTagValue(5, testData.tags.tag100);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            createdInstanceRecordId = id;
          });
        },
      );
    });
  });
});
