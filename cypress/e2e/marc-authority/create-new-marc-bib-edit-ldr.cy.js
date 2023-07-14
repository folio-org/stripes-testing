import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('MARC -> MARC Bibliographic -> Create new MARC bib', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },

    fieldContents: {
      tag245Content: 'Create, non-editable LDR test',
    },

    LDRValues: {
      validLDRvalue: '00000ngs\\a2200000uu\\4500',
      updatedLDRValues: {
        LDRValueWithUpdatedPos10: '00000ngs\\a0200000uu\\4500',
        LDRValueWithUpdatedPos11: '00000ngs\\a2d00000uu\\4500',
        LDRValueWithUpdatedPos20: '00000ngs\\a2200000uu\\X500',
        LDRValueWithUpdatedPos21: '00000ngs\\a2200000uu\\4200',
        LDRValueWithUpdatedPos22: '00000ngs\\a2200000uu\\45\\0',
        LDRValueWithUpdatedPos23: '00000ngs\\a2200000uu\\450t'
      }
    }
  };

  const updatedLDRValuesArray = Object.values(testData.LDRValues.updatedLDRValues);

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
      cy.login(createdUserProperties.username, createdUserProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it('C380707 Editing LDR 10, 11, 20-23 values when creating a new "MARC bib" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventoryInstance.newMarcBibRecord();
    QuickMarcEditor.updateExistingField(testData.tags.tagLDR, testData.LDRValues.validLDRvalue);
    QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.fieldContents.tag245Content}`);

    updatedLDRValuesArray.forEach(LDRValue => {
      QuickMarcEditor.updateExistingField(testData.tags.tagLDR, LDRValue);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkNonEditableLdrCalloutBib();
    });
  });
});
