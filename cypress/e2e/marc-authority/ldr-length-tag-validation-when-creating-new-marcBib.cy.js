import Permissions from '../../support/dictionary/permissions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('MARC -> MARC Bibliographic -> Create new MARC bib', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
      tagL0: 'L0',
      tag0: '0',
      tag10: '10',
      tagABC: 'abc',
      tag100: '100',
    },
    fieldContents: {
      tag245Content: 'A new title',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
      tag0Content: '$a something',
      tagLDRWithLessChar: '00000naa\\a2200000uu\\450',
      tagLDRWithMoreChar: '00000naa\\a2200000uu\\450a2',
    },
    errors: {
      ldrCharacterLength:
        'Record cannot be saved. The Leader must contain 24 characters, including null spaces.',
      tagCharacterLength: 'Record cannot be saved. A MARC tag must contain three characters.',
      invalidTag: 'Invalid MARC tag. Please try again.',
    },
  };

  let userData = {};
  const createdInstanceRecordId = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    InventoryInstance.deleteInstanceViaApi(createdInstanceRecordId[0]);
  });

  it(
    'C380715 LDR length, tag validation when when creating a new "MARC bib" record (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      MarcAuthority.addNewField(4, testData.tags.tag0, testData.fieldContents.tag0Content);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        5,
        '0',
        '\\',
        '\\',
        testData.fieldContents.tag0Content,
      );

      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRWithLessChar,
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errors.ldrCharacterLength);

      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRWithMoreChar,
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errors.ldrCharacterLength);

      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errors.tagCharacterLength);

      QuickMarcEditor.updateExistingTagValue(5, '');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errors.tagCharacterLength);

      QuickMarcEditor.updateExistingTagValue(5, testData.tags.tag10);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errors.tagCharacterLength);

      QuickMarcEditor.updateExistingTagValue(5, testData.tags.tagABC);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errors.invalidTag);

      QuickMarcEditor.updateExistingTagValue(5, testData.tags.tag100);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdInstanceRecordId.push(id);
      });
    },
  );
});
