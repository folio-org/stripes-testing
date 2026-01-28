import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C503067_MarcBibInstance_${randomPostfix}`,
        tag999: '999',
        secondTag999Content: '$a test duplicates',
        tag999IndicatorValue: 'f',
      };

      let testInstanceId;

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            testInstanceId = instanceId;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });

      it(
        'C503067 Derive existing "MARC bib" record with multiple "999 ff" fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503067'] },
        () => {
          InventoryInstances.searchByTitle(testInstanceId);
          InventoryInstances.selectInstanceById(testInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);
          QuickMarcEditor.addValuesToExistingField(
            4,
            '',
            testData.secondTag999Content,
            testData.tag999IndicatorValue,
            testData.tag999IndicatorValue,
          );
          QuickMarcEditor.updateTagNameToLockedTag(5, testData.tag999);

          QuickMarcEditor.verifyTagValue(5, testData.tag999);
          QuickMarcEditor.verifyTagValue(6, testData.tag999);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.waitLoading();

          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.verifyTagValue(5, testData.tag999);
          QuickMarcEditor.checkFieldsCount(6);
          QuickMarcEditor.verifyIndicatorValue(
            testData.tag999,
            testData.tag999IndicatorValue,
            testData.tag999IndicatorValue,
          );
          QuickMarcEditor.verifyNoFieldWithContent(testData.secondTag999Content);
        },
      );
    });
  });
});
