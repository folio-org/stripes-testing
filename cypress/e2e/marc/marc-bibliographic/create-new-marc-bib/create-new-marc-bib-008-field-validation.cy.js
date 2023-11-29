import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import DateTools from '../../../../support/utils/dateTools';

describe('Create new MARC bib', () => {
  const testData = {
    field245: { tag: '245', content: 'The title: the face of a record' },
    fieldLDR: { tag: 'LDR', content: '00000naa\\a2200000uu\\4500' },
  };
  let instanceId;
  const currentDate = DateTools.getCurrentDateYYMMDD();

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(instanceId);
  });

  it(
    'C387449 "008" field existence validation when create new "MARC bib" (spitfire) (null)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(testData.fieldLDR.tag, testData.fieldLDR.content);
      QuickMarcEditor.check008FieldContent();
      QuickMarcEditor.updateExistingField(testData.field245.tag, testData.field245.content);
      QuickMarcEditor.updateExistingTagName('008', '00');
      QuickMarcEditor.checkEmptyContent('00');
      QuickMarcEditor.deleteFieldByTagAndCheck('00');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkDelete008Callout();
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.updateExistingTagName('00', '008');
      QuickMarcEditor.check008FieldContent();
      cy.intercept('records-editor/records').as('saveMarc');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      cy.wait('@saveMarc').then((res) => {
        expect(res.request.body.fields[0].content).not.to.have.property('Entered');
      });
      InventoryInstance.getId().then((id) => {
        instanceId = id;
      });
      cy.intercept('GET', '**records-editor/records?externalId=**').as('editMarc');
      InventoryInstance.editMarcBibliographicRecord();
      cy.wait('@editMarc').then((res) => {
        expect(res.response.body.fields[1].content.Entered).to.be.eq(currentDate);
      });
    },
  );
});
