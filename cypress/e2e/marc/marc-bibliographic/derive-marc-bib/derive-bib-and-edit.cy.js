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
      const title = `AT_C345388_MarcBibInstance_${getRandomPostfix()}`;
      const oldContributorValues = ['Content 700', 'Content 710'];
      const subjectValue = 'Content 610';
      const contributorValue = 'Content 711';
      const indicatorValue = '\\';
      const defaultContent = '$a ';
      const tags = {
        tag008: '008',
        tag245: '245',
        tag610: '610',
        tag700: '700',
        tag710: '710',
        tag711: '711',
      };
      const existingFields = [
        { rowIndex: 5, tag: tags.tag700, content: `$a ${oldContributorValues[0]}` },
        { rowIndex: 6, tag: tags.tag710, content: `$a ${oldContributorValues[1]}` },
      ];
      const fieldToDelete = existingFields[0];
      const updatedField = {
        rowIndex: 6,
        oldTag: tags.tag710,
        newTag: tags.tag610,
        content: `$a ${subjectValue}`,
      };
      const newField = { rowIndex: 7, tag: tags.tag711, content: `$a ${contributorValue}` };
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
      let originalHrid;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.getInstanceById(createdInstanceId).then((instance) => {
              originalHrid = instance.hrid;

              cy.login(userProperties.username, userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C345388 Derive a MARC bib record (spitfire)',
        { tags: ['smoke', 'spitfire', 'C345388'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.checkDerivePaneheader();

          QuickMarcEditor.addEmptyFields(newField.rowIndex - 1);
          QuickMarcEditor.verifyTagField(
            newField.rowIndex,
            '',
            indicatorValue,
            indicatorValue,
            defaultContent,
            '',
          );
          QuickMarcEditor.addValuesToExistingField(
            newField.rowIndex - 1,
            newField.tag,
            newField.content,
          );
          QuickMarcEditor.verifyTagField(
            newField.rowIndex,
            newField.tag,
            indicatorValue,
            indicatorValue,
            newField.content,
            '',
          );

          QuickMarcEditor.deleteFieldAndCheck(fieldToDelete.rowIndex, fieldToDelete.tag);
          QuickMarcEditor.afterDeleteNotification(fieldToDelete.tag);

          QuickMarcEditor.addValuesToExistingField(
            updatedField.rowIndex - 1,
            updatedField.newTag,
            updatedField.content,
          );
          QuickMarcEditor.verifyTagField(
            updatedField.rowIndex,
            updatedField.newTag,
            indicatorValue,
            indicatorValue,
            updatedField.content,
            '',
          );

          QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkPresentedText(title);
          InventoryInstance.checkPresentedText(contributorValue);
          InventoryInstance.checkPresentedText(subjectValue);
          oldContributorValues.forEach((value) => InventoryInstance.verifyContributorAbsent(value));
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.checkUpdatedHRID(originalHrid);

          InventoryInstance.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue(newField.tag, newField.content);
          InventoryViewSource.checkRowExistsWithTagAndValue(
            updatedField.newTag,
            updatedField.content,
          );
          oldContributorValues.forEach((value) => InventoryViewSource.notContains(value));
        },
      );
    });
  });
});
