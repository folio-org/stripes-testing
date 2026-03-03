import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const testData = {
        tag004: '004',
        tag008: '008',
        tag852: '852',
        tag866: '866',
        tag868: '868',
        marcBibTitle: `AT_C451564_MarcBibInstance_${getRandomPostfix()}`,
        tag866Content: '$8 0 $a v.54-68 (2003-2017) $z {dollar}dollar test',
        tag866UpdatedContent: '$8 0 $a v.54-68 (2003-2017) $z {dollar}dollar test 50 {dollar}',
        tag852AdditionalContent:
          '$h BR140 $i .J86 $x dbe=c $z Current issues in Periodicals Room $x CHECK-IN RECORD CREATED',
      };
      const newFieldValues = [
        { tag: testData.tag868, content: '$A upper case first code test' },
        { tag: testData.tag868, content: '$a upper case $B not First $C Code $d TEST' },
        { tag: testData.tag868, content: '$B A$AP $bp' },
      ];
      const statementNoteFinalValue = '$dollar test 50 $';
      const newFieldsFinalValues = [
        { tag: testData.tag868, content: '$a upper case first code test' },
        { tag: testData.tag868, content: '$a upper case $b not First $c Code $d TEST' },
        { tag: testData.tag868, content: '$b A $a P $b p' },
      ];

      let recordId;
      let user;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (location) => {
              cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
                recordId = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  cy.createMarcHoldingsViaAPI(instanceData.id, [
                    {
                      content: instanceData.hrid,
                      tag: testData.tag004,
                    },
                    {
                      content: QuickMarcEditor.defaultValid008HoldingsValues,
                      tag: testData.tag008,
                    },
                    {
                      content: `$b ${location.code} ${testData.tag852AdditionalContent}`,
                      indicators: ['0', '1'],
                      tag: testData.tag852,
                    },
                    {
                      content: testData.tag866Content,
                      indicators: ['4', '1'],
                      tag: testData.tag866,
                    },
                  ]);
                });
              });
            },
          );
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C451564 Edit "MARC holdings" record which has "$" sign ("{dollar}" code) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C451564'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitLoading();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(testData.tag866, testData.tag866Content);

          QuickMarcEditor.updateExistingField(testData.tag866, testData.tag866UpdatedContent);
          QuickMarcEditor.checkContentByTag(testData.tag866, testData.tag866UpdatedContent);
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();

          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.addEmptyFields(3 + i);
            QuickMarcEditor.checkEmptyFieldAdded(4 + i);
            QuickMarcEditor.addValuesToExistingField(
              3 + i,
              newFieldValues[i].tag,
              newFieldValues[i].content,
            );
          }

          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.verifyTagField(
              4 + i,
              newFieldValues[i].tag,
              '\\',
              '\\',
              newFieldValues[i].content,
              '',
            );
          }

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(testData.tag866, testData.tag866UpdatedContent);
          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.verifyTagField(
              4 + i,
              newFieldValues[i].tag,
              '\\',
              '\\',
              newFieldValues[i].content,
              '',
            );
          }

          QuickMarcEditor.pressCancel();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkHoldingsStatement(statementNoteFinalValue);

          HoldingsRecordView.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag866,
            statementNoteFinalValue,
          );
          newFieldsFinalValues.forEach((field) => {
            InventoryViewSource.checkRowExistsWithTagAndValue(field.tag, field.content);
          });
        },
      );
    });
  });
});
