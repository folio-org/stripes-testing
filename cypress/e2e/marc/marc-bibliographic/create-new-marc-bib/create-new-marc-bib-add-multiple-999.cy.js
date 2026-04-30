import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        field999First: {
          tag: '999',
          content: '$a This field will be removed',
          indicators: ['f', 'f'],
        },
        field999Second: {
          tag: '999',
          content: '$a This field will be saved',
          indicators: ['1', '2'],
        },
        field245: { tag: '245', content: 'The most important book', indicators: ['1', '1'] },
      };
      let instanceId;

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
        'C380716 Add multiple 999s when creating "MARC Bibliographic" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380716'] },
        () => {
          // Click on "Actions" button in second pane → Select "+New MARC Bib Record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkEmptyContent(testData.field999First.tag);

          // Fill "$a" value in "245" field
          QuickMarcEditor.updateExistingField(testData.field245.tag, testData.field245.content);
          QuickMarcEditor.updateIndicatorValue(
            testData.field245.tag,
            testData.field245.indicators[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.field245.tag,
            testData.field245.indicators[1],
            1,
          );

          // Replace blank values in LDR positions 06, 07 with valid values
          QuickMarcEditor.updateLDR06And07Positions();

          // Add new 999 fields
          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);
          QuickMarcEditor.fillInFieldValues(
            5,
            testData.field999First.tag,
            testData.field999First.content,
            ...testData.field999First.indicators,
          );

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);
          QuickMarcEditor.fillInFieldValues(
            5,
            testData.field999Second.tag,
            testData.field999Second.content,
            ...testData.field999Second.indicators,
          );

          QuickMarcEditor.verifyTagField(
            5,
            testData.field999Second.tag,
            testData.field999Second.indicators[0],
            testData.field999Second.indicators[1],
            testData.field999Second.content,
            '',
          );
          QuickMarcEditor.verifyTagField(
            6,
            testData.field999First.tag,
            testData.field999First.indicators[0],
            testData.field999First.indicators[1],
            testData.field999First.content,
            '',
          );

          // Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            instanceId = id;
          });

          // Click on "Actions" button in third pane → Select "Edit MARC bibliographic record" option
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Check that only expected "999" fields are shown
          QuickMarcEditor.verifyNoFieldWithContent(testData.field999First.content);
          QuickMarcEditor.verifyTagField(
            5,
            testData.field999Second.tag,
            testData.field999Second.indicators[0],
            testData.field999Second.indicators[1],
            testData.field999Second.content,
            '',
          );
          QuickMarcEditor.verifyTagField(6, testData.field999Second.tag, 'f', 'f', '$s', '$i');
        },
      );
    });
  });
});
