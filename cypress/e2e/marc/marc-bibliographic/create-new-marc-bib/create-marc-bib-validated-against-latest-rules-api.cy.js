import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C552451_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        tag700: '700',
        localFieldTag: '981',
        field245Content:
          'Create MARC bib: check that it will be verified against the latest version of MARC validation rules',
        localFieldContent: '$a AT_C552451_Local Not Required field',
      };

      let user;
      let bibliographicSpecId;
      let field700Id;
      let field700InitialProperties;
      let createdLocalFieldId;
      const createdInstanceIds = [];

      before('Create test data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.specificationStorageGetSpecificationFields.gui,
          Permissions.specificationStorageCreateSpecificationField.gui,
          Permissions.specificationStorageUpdateSpecificationField.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getSpecificationIds({ profile: 'bibliographic', include: 'all' }).then((specs) => {
            const spec = specs.find((s) => s.profile === 'bibliographic');
            bibliographicSpecId = spec.id;

            const field700 = spec.fields.find((f) => f.tag === testData.tag700);
            const localField = spec.fields.find((f) => f.tag === testData.localFieldTag);
            if (localField) {
              // Delete local field if it exists from previous test runs
              cy.deleteSpecificationField(localField.id, true);
            }
            if (field700) {
              field700Id = field700.id;
              field700InitialProperties = {
                tag: field700.tag,
                label: field700.label,
                url: field700.url || 'https://www.loc.gov/marc/bibliographic/bd700.html',
                repeatable: field700.repeatable,
                required: field700.required,
                deprecated: field700.deprecated,
              };

              if (!field700.required) {
                cy.updateSpecificationField(field700Id, {
                  tag: testData.tag700,
                  label: field700.label,
                  url: field700.url || 'https://www.loc.gov/marc/bibliographic/bd700.html',
                  repeatable: field700.repeatable,
                  required: true,
                  deprecated: false,
                });
              }
            }
          });

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (createdLocalFieldId) {
          cy.deleteSpecificationField(createdLocalFieldId, false);
        }
        if (field700Id && field700InitialProperties) {
          cy.updateSpecificationField(field700Id, field700InitialProperties, false);
        }
        Users.deleteViaApi(user.userId);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C552451 Verify that created MARC bib record is checked against the last version of MARC validation rules (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C552451', 'nonParallel'] },
        () => {
          // Step 1: Open "Create a new MARC bib record" window
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Step 2-3: Select valid values in LDR positions 06, 07 and 008 field dropdowns
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 4: Fill in the $a subfield of 245 field
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.field245Content}`);

          // Step 5-6: Ensure no 700 field exists and add undefined field 981
          MarcAuthority.addNewField(4, testData.localFieldTag, testData.localFieldContent);

          // Step 7: Click "Save & close" and verify error for required field 700
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(`Field ${testData.tag700} is required.`);

          // Step 8: Send PUT request to set field 700 required=false
          cy.getAdminToken();
          cy.updateSpecificationField(field700Id, {
            tag: testData.tag700,
            label: 'Added Entry - Personal Name',
            url: 'https://www.loc.gov/marc/bibliographic/bd700.html',
            repeatable: true,
            required: false,
            deprecated: false,
          }).then((response) => {
            expect(response.status).to.eq(202);
            expect(response.body.required).to.eq(false);
          });

          // Step 9: Click "Save & close" again (undefined field warning still present)
          QuickMarcEditor.pressSaveAndCloseButton();

          // Step 10: Send POST request to create validation rule for field 981
          cy.getAdminToken();
          cy.createSpecificationField(bibliographicSpecId, {
            tag: testData.localFieldTag,
            label: 'AT_C552451_Custom Field - Contributor Data',
            url: 'http://www.example.org/field981.html',
            repeatable: true,
            required: false,
            deprecated: false,
            scope: 'local',
          }).then((response) => {
            expect(response.status).to.eq(201);
            expect(response.body.tag).to.eq(testData.localFieldTag);
            createdLocalFieldId = response.body.id;
          });

          // Step 11: Update 245 field and save successfully
          QuickMarcEditor.updateExistingField(
            testData.tag245,
            `$a ${testData.field245Content} - Updated`,
          );

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.getId().then((id) => {
            createdInstanceIds.push(id);
          });

          InventoryInstance.checkInstanceTitle(`${testData.field245Content} - Updated`);
        },
      );
    });
  });
});
