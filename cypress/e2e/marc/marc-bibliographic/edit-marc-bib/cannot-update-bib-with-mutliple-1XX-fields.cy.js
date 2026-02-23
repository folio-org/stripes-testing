import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getBibliographicSpec } from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        title: `AT_C515005_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag245: '245',
          tag100: '100',
          tag101: '101',
          tag109: '109',
          tag110: '110',
          tag140: '140',
          tag150: '150',
        },
        field1Content: '$a 1XX field one',
        field2Content: '$a 1XX field two',
        nonRepeatable1XXError: 'Fail: Field 1XX is non-repeatable.',
        nonRepeatableError: 'Fail: Field is non-repeatable.',
        valid245indicatorValue: '1',
      };
      const new1XXField1 = {
        tag: testData.tags.tag140,
        label: 'AT Custom Field - Local Bib Field 140',
        repeatable: false,
      };
      const new1XXField2 = {
        tag: testData.tags.tag150,
        label: 'AT Custom Field - Local Bib Field 150',
        repeatable: false,
      };
      const fieldPairs = [
        {
          tag1: testData.tags.tag100,
          tag2: testData.tags.tag100,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError, testData.nonRepeatableError],
        },
        {
          tag1: testData.tags.tag100,
          tag2: testData.tags.tag110,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError],
        },
        {
          tag1: testData.tags.tag140,
          tag2: testData.tags.tag140,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError, testData.nonRepeatableError],
        },
        {
          tag1: testData.tags.tag140,
          tag2: testData.tags.tag150,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError],
        },
        {
          tag1: testData.tags.tag110,
          tag2: testData.tags.tag150,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError],
        },
        {
          tag1: testData.tags.tag101,
          tag2: testData.tags.tag101,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError],
        },
        {
          tag1: testData.tags.tag101,
          tag2: testData.tags.tag109,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError],
        },
        {
          tag1: testData.tags.tag100,
          tag2: testData.tags.tag109,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError],
        },
        {
          tag1: testData.tags.tag140,
          tag2: testData.tags.tag109,
          field1Errors: [testData.nonRepeatable1XXError],
          field2Errors: [testData.nonRepeatable1XXError],
        },
      ];
      let user;
      let createdInstanceId;
      let bibSpecId;
      const newFieldIds = [];

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((createdUserProperties) => {
            user = createdUserProperties;

            getBibliographicSpec()
              .then((bibSpec) => {
                bibSpecId = bibSpec.id;
                cy.deleteSpecificationFieldByTag(bibSpecId, new1XXField1.tag, false);
                cy.deleteSpecificationFieldByTag(bibSpecId, new1XXField2.tag, false);
              })
              .then(() => {
                cy.createSpecificationField(bibSpecId, new1XXField1).then(({ body }) => {
                  newFieldIds.push(body.id);
                });
                cy.createSpecificationField(bibSpecId, new1XXField2).then(({ body }) => {
                  newFieldIds.push(body.id);
                });
              });
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(testData.title).then((instanceId) => {
              createdInstanceId = instanceId;

              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.deleteSpecificationFieldByTag(bibSpecId, new1XXField1.tag, false);
        cy.deleteSpecificationFieldByTag(bibSpecId, new1XXField2.tag, false);
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C515005 Cannot update MARC bib record with multiple 1XX fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C515005'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.valid245indicatorValue,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.valid245indicatorValue,
            1,
          );

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.checkEmptyFieldAdded(6);

          fieldPairs.forEach((pair) => {
            QuickMarcEditor.addValuesToExistingField(4, pair.tag1, testData.field1Content);
            QuickMarcEditor.verifyTagValue(5, pair.tag1);
            QuickMarcEditor.addValuesToExistingField(5, pair.tag2, testData.field2Content);
            QuickMarcEditor.verifyTagValue(6, pair.tag2);

            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.verifyValidationCallout(
              0,
              pair.field1Errors.length + pair.field2Errors.length,
            );
            QuickMarcEditor.closeAllCallouts();
            pair.field1Errors.forEach((error) => QuickMarcEditor.checkErrorMessage(5, error));
            pair.field2Errors.forEach((error) => QuickMarcEditor.checkErrorMessage(6, error));
          });

          QuickMarcEditor.deleteFieldAndCheck(6);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.title);
        },
      );
    });
  });
});
