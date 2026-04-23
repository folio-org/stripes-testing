import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findStandardField,
  findLocalField,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();

      const instanceTitle = 'The Journal of ecclesiastical history.';
      const instanceTitleUpdated1 = 'The Journal of ecclesiastical history. test1';
      const instanceTitleUpdated2 = 'The Journal of ecclesiastical history. test1 test2';

      const testData = {
        tag008: '008',
        tag245: '245',
        tag700: '700',
        tag948: '948',
        field245OriginalContent: `$a ${instanceTitle}`,
        field245UpdatedContent1: `$a ${instanceTitleUpdated1}`,
        field245UpdatedContent2: `$a ${instanceTitleUpdated2}`,
        errorMessageField700Required: 'Field 700 is required.',
        errorMessageField948Undefined: 'Warn: Field is undefined.',
        expectedWarningCountStep3: 3,
        expectedWarningCountStep8: 18,
        expectedFailCountStep8: 1,
        statusValue: 'Current',
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: testData.field245OriginalContent,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag948,
          content: '$a 20070525 $h RLINAMC $i RLINAMC1.mrc',
          indicators: ['3', '\\'],
        },
        {
          tag: testData.tag948,
          content: '$a 20170127 $b m $d ee11 $e rmc',
          indicators: ['2', '\\'],
        },
        {
          tag: testData.tag948,
          content: '$a 20170906 $b m $d batch $e lts $x add899forArchivesSpace',
          indicators: ['2', '\\'],
        },
      ];

      let specId;
      let createdInstanceId;
      let user;
      let field700Id;
      let field948Id;
      let field700OriginalData;

      before('Create test data', () => {
        cy.getAdminToken();

        getBibliographicSpec().then((bibSpec) => {
          specId = bibSpec.id;
          cy.syncSpecifications(specId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        // Disable undefined validation rules
        toggleAllUndefinedValidationRules(specId, { enable: false });

        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        // Restore field 700 to not required
        if (field700Id && field700OriginalData) {
          cy.updateSpecificationField(
            field700Id,
            {
              ...field700OriginalData,
              required: false,
            },
            false,
          );
        }
        // Delete local field 948 if created
        if (field948Id) {
          cy.deleteSpecificationField(field948Id, false);
        }

        cy.syncSpecifications(specId);
      });

      it(
        'C552453 Verify that edited MARC bib record is checked against the last version of MARC validation rules (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C552453', 'nonParallel'] },
        () => {
          cy.then(() => {
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.specificationStorageGetSpecificationFields.gui,
              Permissions.specificationStorageCreateSpecificationField.gui,
              Permissions.specificationStorageUpdateSpecificationField.gui,
            ]).then((userProperties) => {
              user = userProperties;

              // Disable undefined validation rules before creating bib
              toggleAllUndefinedValidationRules(specId, { enable: false });

              // Create MARC bib via API
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceIdValue) => {
                  createdInstanceId = instanceIdValue;

                  // Enable undefined validation rules after creating bib
                  toggleAllUndefinedValidationRules(specId, { enable: true });
                },
              );
            });
          })
            .then(() => {
              // Login and navigate to UI
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              // Steps 1-5: Work in UI before API changes
              // Step 1: Navigate to the instance and open edit MARC bib
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstance();
              InventoryInstance.waitLoading();

              // Click Actions → Edit MARC bibliographic record
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Update field 245 $a subfield (add "test")
              QuickMarcEditor.updateExistingField(
                testData.tag245,
                testData.field245UpdatedContent1,
              );
              QuickMarcEditor.checkContentByTag(testData.tag245, testData.field245UpdatedContent1);

              // Step 3: Click "Save & keep editing" - should show warning for undefined field 948
              QuickMarcEditor.clickSaveAndKeepEditingButton();

              // Verify warning for undefined field 948
              QuickMarcEditor.verifyValidationCallout(testData.expectedWarningCountStep3, 0);
              QuickMarcEditor.closeAllCallouts();
              [5, 6, 7].forEach((rowIndex) => {
                QuickMarcEditor.checkWarningMessageForField(
                  rowIndex,
                  testData.errorMessageField948Undefined,
                );
              });

              // Step 4: Click "Save & keep editing" again - should succeed
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.checkMarcBibHeader(
                {
                  instanceTitle: instanceTitleUpdated1,
                  status: testData.statusValue,
                },
                '',
              );

              // Step 5: Update field 245 $a subfield again (add "test2")
              QuickMarcEditor.updateExistingField(
                testData.tag245,
                testData.field245UpdatedContent2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag245, testData.field245UpdatedContent2);
            })
            .then(() => {
              // Steps 6-7: API changes to validation rules
              cy.getAdminToken().then(() => {
                cy.getSpecificationFields(specId).then((response) => {
                  // Step 6: Via API - Update field 700 validation rule to make it required
                  const field700 = findStandardField(response.body.fields, testData.tag700);
                  field700Id = field700.id;
                  field700OriginalData = { ...field700 };

                  cy.updateSpecificationField(
                    field700Id,
                    {
                      ...field700,
                      required: true,
                    },
                    false,
                  );

                  // Delete existing field 948 if it exists
                  const existingField948 = findLocalField(response.body.fields, testData.tag948);
                  if (existingField948) {
                    cy.deleteSpecificationField(existingField948.id, false);
                  }

                  // Create field 948 validation rule
                  const field948Data = {
                    tag: testData.tag948,
                    label: `Custom Field - Contributor Data ${randomPostfix}`,
                    url: 'http://www.example.org/C552453field948.html',
                    repeatable: true,
                    required: false,
                    deprecated: false,
                  };

                  cy.createSpecificationField(specId, field948Data, false).then((fieldResp) => {
                    field948Id = fieldResp.body.id;
                  });
                });
              });
            })
            .then(() => {
              // Restore user authorization after API changes
              cy.wait(2000);
              cy.getToken(user.username, user.password);

              // Step 8: Work in UI after API changes - Click "Save & close"
              QuickMarcEditor.pressSaveAndCloseButton();

              // Verify error for missing required field 700
              QuickMarcEditor.checkCallout(testData.errorMessageField700Required);
              QuickMarcEditor.verifyValidationCallout(
                testData.expectedWarningCountStep8,
                testData.expectedFailCountStep8,
              );
              QuickMarcEditor.checkButtonsEnabled();
            });
        },
      );
    });
  });
});
