import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findLocalField,
  generateTestFieldData,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testCaseId = 'C523613';
      const bibTitle = `AT_${testCaseId}_MarcBibInstance_${randomPostfix}`;
      const tag245rowIndex = 4;

      const testData = {
        tag008: '008',
        tag090: '090',
        tag245: '245',
        tag955: '955',
        field955Content1: '$a test field 1',
        field955Content2: '$a test field 2',
        field090Content: '$a test1 $a test 2',
        errorFieldNonRepeatable: 'Fail: Field is non-repeatable.',
        errorSubfieldANonRepeatable: "Fail: Subfield 'a' is non-repeatable.",
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a ${bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      let specId;
      let createdInstanceId;
      let user;
      let field955Id;

      before('Get bib spec ID and sync spec', () => {
        cy.getAdminToken();
        getBibliographicSpec().then((bibSpec) => {
          specId = bibSpec.id;
          cy.syncSpecifications(specId);
        });
      });

      after('Delete test data and local field, sync spec', () => {
        cy.getAdminToken();
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        if (field955Id) cy.deleteSpecificationField(field955Id, false);
        cy.syncSpecifications(specId);
      });

      it(
        'C523613 "Help" hyperlink doesn\'t display when error occurs for the field without "Help URL" in MARC Bib validation rules (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C523613', 'nonParallel'] },
        () => {
          cy.then(() => {
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
            });
          })
            .then(() => {
              // Create local field 955 as non-repeatable and without "url" key
              cy.getSpecificationFields(specId).then((response) => {
                const existingField955 = findLocalField(response.body.fields, testData.tag955);
                if (existingField955) {
                  cy.deleteSpecificationField(existingField955.id, false);
                }

                const field955Data = generateTestFieldData(testCaseId, {
                  tag: testData.tag955,
                  label: `No_Url_Local_Field_${randomPostfix}`,
                  scope: 'local',
                  repeatable: false,
                  required: false,
                });

                cy.createSpecificationField(specId, field955Data, false).then((fieldResp) => {
                  field955Id = fieldResp.body.id;
                });
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            })
            .then(() => {
              // Step 1: Open "Edit MARC record" pane
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Add two 955 fields and one 090 field with duplicate $a
              QuickMarcEditor.addNewField(
                testData.tag955,
                testData.field955Content1,
                tag245rowIndex,
              );
              QuickMarcEditor.verifyTagValue(tag245rowIndex + 1, testData.tag955);
              QuickMarcEditor.checkContent(testData.field955Content1, tag245rowIndex + 1);

              QuickMarcEditor.addNewField(
                testData.tag955,
                testData.field955Content2,
                tag245rowIndex + 1,
              );
              QuickMarcEditor.verifyTagValue(tag245rowIndex + 2, testData.tag955);
              QuickMarcEditor.checkContent(testData.field955Content2, tag245rowIndex + 2);

              QuickMarcEditor.addNewField(
                testData.tag090,
                testData.field090Content,
                tag245rowIndex + 2,
              );
              QuickMarcEditor.verifyTagValue(tag245rowIndex + 3, testData.tag090);
              QuickMarcEditor.checkContent(testData.field090Content, tag245rowIndex + 3);

              // Step 3: Click "Save & close" and verify errors without "Help" links
              QuickMarcEditor.pressSaveAndCloseButton();

              // Verify non-repeatable error for second 955 field
              QuickMarcEditor.checkErrorMessage(
                tag245rowIndex + 2,
                testData.errorFieldNonRepeatable,
              );
              // Verify "Help" link is NOT shown for 955 error
              QuickMarcEditor.checkErrorMessage(tag245rowIndex + 2, 'Help', false);

              // Verify non-repeatable subfield error for 090 field
              QuickMarcEditor.checkErrorMessage(
                tag245rowIndex + 3,
                testData.errorSubfieldANonRepeatable,
              );
              // Verify "Help" link is NOT shown for 090 error
              QuickMarcEditor.checkErrorMessage(tag245rowIndex + 3, 'Help', false);
            });
        },
      );
    });
  });
});
