import getRandomPostfix from '../../../../support/utils/stringTools';
import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const title = `AT_C359240_MarcBibInstance_${getRandomPostfix()}`;
      const tags = {
        tag008: '008',
        tag100: '100',
        tag700: '700',
        tag710: '710',
        tag711: '711',
        tag730: '730',
        tag750: '750',
        tag245: '245',
        tag610: '610',
        tag630: '630',
        tag810: '810',
        tag811: '811',
      };

      const existingFields = [
        { tag: tags.tag700, content: '$a Content 700' },
        { tag: tags.tag710, content: '$a Content 710' },
        { tag: tags.tag711, content: '$a Content 711' },
        { tag: tags.tag730, content: '$a Content 730' },
        { tag: tags.tag750, content: '$a Content 750' },
      ];

      const existingFieldsUpdated = [
        { tag: tags.tag100, content: '$a Content 700' },
        { tag: tags.tag810, content: '$a Content 710 UPD' },
        { tag: tags.tag811, content: '$a Content 711 UPD' },
        { tag: '', content: '$a Content 730' },
      ];

      const newFields = [
        { tag: '', content: '$a' },
        { tag: tags.tag610, content: '$a' },
        { tag: '', content: '$a Content 611' },
        { tag: tags.tag630, content: '$a Content 630' },
      ];

      const marcInstanceFields = [
        {
          tag: tags.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: tags.tag245,
          content: `$a ${title}`,
          indicators: ['1', '1'],
        },
      ];

      existingFields.forEach((field) => {
        marcInstanceFields.push({
          tag: field.tag,
          content: field.content,
          indicators: ['\\', '\\'],
        });
      });

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

            cy.waitForAuthRefresh(() => {
              cy.login(userProperties.username, userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(title);
      });

      it(
        'C359240 Derive MARC Bib | Displaying of placeholder message when user deletes a row (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C359240'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.checkDerivePaneheader();

          newFields.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, 9 + index);
          });
          newFields.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 10 + index);
            QuickMarcEditor.verifyTagValue(10 + index, field.tag);
          });
          for (let i = 0; i < newFields.length; i++) {
            QuickMarcEditor.deleteField(10);
            cy.wait(200);
          }
          QuickMarcEditor.checkNoDeletePlaceholder();
          QuickMarcEditor.checkFieldsCount(11);

          QuickMarcEditor.deleteField(9);
          QuickMarcEditor.afterDeleteNotification(existingFields[4].tag);

          QuickMarcEditor.undoDelete();
          QuickMarcEditor.checkContent(existingFields[4].content, 9);
          QuickMarcEditor.verifyTagValue(9, existingFields[4].tag);

          existingFieldsUpdated.forEach((field, index) => {
            QuickMarcEditor.addValuesToExistingField(5 + index - 1, field.tag, field.content);
          });
          existingFieldsUpdated.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 5 + index);
            QuickMarcEditor.verifyTagValue(5 + index, field.tag);
          });

          existingFieldsUpdated.forEach((_, index) => {
            QuickMarcEditor.deleteField(5 + index);
          });
          existingFieldsUpdated.forEach((field) => {
            QuickMarcEditor.afterDeleteNotification(field.tag);
          });

          QuickMarcEditor.undoDelete();
          existingFieldsUpdated.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 5 + index);
            QuickMarcEditor.verifyTagValue(5 + index, field.tag);
          });

          QuickMarcEditor.deleteField(8);
          QuickMarcEditor.deleteField(9);
          QuickMarcEditor.afterDeleteNotification(existingFieldsUpdated[3].tag);
          QuickMarcEditor.afterDeleteNotification(existingFields[4].tag);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.deleteConfirmationPresented();
          QuickMarcEditor.restoreDeletedFields();
          QuickMarcEditor.checkContent(existingFieldsUpdated[3].content, 8);
          QuickMarcEditor.verifyTagValue(8, existingFieldsUpdated[3].tag);
          QuickMarcEditor.checkContent(existingFields[4].content, 9);
          QuickMarcEditor.verifyTagValue(9, existingFields[4].tag);

          QuickMarcEditor.deleteField(8);
          QuickMarcEditor.deleteField(9);
          QuickMarcEditor.afterDeleteNotification(existingFieldsUpdated[3].tag);
          QuickMarcEditor.afterDeleteNotification(existingFields[4].tag);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();

          InventoryInstance.viewSource();
          InventoryViewSource.contains(existingFieldsUpdated[0].content);
          InventoryViewSource.contains(existingFieldsUpdated[1].content);
          InventoryViewSource.contains(existingFieldsUpdated[2].content);
          InventoryViewSource.checkRowsCount(9);
        },
      );
    });
  });
});
