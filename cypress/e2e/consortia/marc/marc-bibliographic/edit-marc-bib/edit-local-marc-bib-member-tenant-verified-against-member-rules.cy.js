import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findStandardField,
  findLocalField,
} from '../../../../../support/api/specifications-helper';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instanceTitle = `AT_C552468_MarcBibInstance_${randomPostfix}`;
        const instanceTitleEdited = `${instanceTitle} test`;

        const testData = {
          tag008: '008',
          tag245: '245',
          tag700: '700',
          tag980: '980',
          field245OriginalContent: `$a ${instanceTitle}`,
          field245EditedContent: `$a ${instanceTitleEdited}`,
          field700Content: '$a Required field 1',
          field980Content: '$a Required field 2',
          errorMessageField700Required: 'Field 700 is required.',
          errorMessageField980Required: 'Field 980 is required.',
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
        ];

        let centralSpecId;
        let memberSpecId;
        let user;
        let sourceInstanceId;
        let centralField700Id;
        let memberField980Id;
        let memberField700Id;
        let memberField700OriginalData;

        before('Create test data', () => {
          cy.getAdminToken();

          // Get specification IDs for both tenants
          getBibliographicSpec().then((centralBibSpec) => {
            centralSpecId = centralBibSpec.id;
            cy.syncSpecifications(centralBibSpec.id);
          });

          cy.withinTenant(Affiliations.College, () => {
            getBibliographicSpec().then((memberBibSpec) => {
              memberSpecId = memberBibSpec.id;
              cy.syncSpecifications(memberSpecId);
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Restore Central tenant validation rules
          cy.syncSpecifications(centralSpecId);

          // Restore Member tenant validation rules
          cy.withinTenant(Affiliations.College, () => {
            if (memberField700Id && memberField700OriginalData) {
              cy.updateSpecificationField(
                memberField700Id,
                { ...memberField700OriginalData, required: false },
                false,
              );
            }
            if (memberField980Id) {
              // Delete field 980 on Member if it was created
              cy.deleteSpecificationField(memberField980Id, false);
            }
            cy.syncSpecifications(memberSpecId);

            if (user?.userId) Users.deleteViaApi(user.userId);
            if (sourceInstanceId) {
              InventoryInstance.deleteInstanceViaApi(sourceInstanceId);
            }
          });
        });

        it(
          'C552468 Edited Local MARC bib record on Member tenant is verified against Member tenant rules (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C552468', 'nonParallel'] },
          () => {
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();

              cy.withinTenant(Affiliations.College, () => {
                // Create source Local MARC bib via API on Member tenant
                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcBibFields,
                ).then((instanceIdValue) => {
                  sourceInstanceId = instanceIdValue;
                });
              });

              // Setup Central tenant validation rules
              // Field 700 must be NOT required on Central
              cy.getSpecificationFields(centralSpecId).then((response) => {
                const field700 = findStandardField(response.body.fields, testData.tag700);
                if (field700) {
                  centralField700Id = field700.id;

                  if (field700.required) {
                    cy.updateSpecificationField(
                      centralField700Id,
                      {
                        ...field700,
                        required: false,
                      },
                      false,
                    );
                  }
                }

                // Field 980 must not exist on Central (delete if exists)
                const existingField980 = findLocalField(response.body.fields, testData.tag980);
                if (existingField980) {
                  cy.deleteSpecificationField(existingField980.id, false);
                }
              });

              // Setup Member tenant validation rules
              cy.withinTenant(Affiliations.College, () => {
                // Field 700 must be required on Member
                cy.getSpecificationFields(memberSpecId).then((response) => {
                  const field700 = findStandardField(response.body.fields, testData.tag700);
                  if (field700) {
                    memberField700Id = field700.id;
                    memberField700OriginalData = { ...field700 };

                    if (!field700.required) {
                      cy.updateSpecificationField(
                        memberField700Id,
                        {
                          ...field700,
                          required: true,
                        },
                        false,
                      );
                    }
                  }

                  // Field 980 must be required on Member
                  const existingField980 = findLocalField(response.body.fields, testData.tag980);
                  if (existingField980) {
                    memberField980Id = existingField980.id;
                    if (!existingField980.required) {
                      cy.updateSpecificationField(
                        memberField980Id,
                        {
                          ...existingField980,
                          required: true,
                        },
                        false,
                      );
                    }
                  } else {
                    // Create field 980 as required on Member
                    cy.createSpecificationField(
                      memberSpecId,
                      {
                        tag: testData.tag980,
                        label: `AT_C552468_Custom Field ${randomPostfix}`,
                        url: 'http://www.example.org/C552468field980.html',
                        repeatable: true,
                        required: true,
                        deprecated: false,
                      },
                      false,
                    ).then((fieldResp) => {
                      memberField980Id = fieldResp.body.id;
                    });
                  }
                });
              });
            })
              .then(() => {
                // Create user in Member tenant
                cy.setTenant(Affiliations.College);
                cy.createTempUser([
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                ]).then((userProperties) => {
                  user = userProperties;
                });
              })
              .then(() => {
                // Login to Member tenant
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

                // Navigate to source Local instance
                InventoryInstances.searchByTitle(sourceInstanceId);
                InventoryInstances.selectInstanceById(sourceInstanceId);
                InventoryInstance.waitLoading();

                // Step 1: Click Actions → Edit MARC bibliographic record
                InventoryInstance.editMarcBibliographicRecord();
                QuickMarcEditor.waitLoading();

                // Step 2: Update $a subfield of 245 field
                QuickMarcEditor.updateExistingField(
                  testData.tag245,
                  testData.field245EditedContent,
                );
                QuickMarcEditor.checkContentByTag(testData.tag245, testData.field245EditedContent);

                // Step 3: Make sure no field 700 exists and no undefined fields
                QuickMarcEditor.checkTagAbsent(testData.tag700);

                // Step 4: Click "Save & close" - should get errors for missing 700 and 980
                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.checkCallout(testData.errorMessageField700Required);
                QuickMarcEditor.checkCallout(testData.errorMessageField980Required);
                QuickMarcEditor.closeAllCallouts();
                QuickMarcEditor.checkButtonsEnabled();

                // Step 5: Add both required fields
                QuickMarcEditor.addNewField(testData.tag700, testData.field700Content, 4);
                QuickMarcEditor.checkContentByTag(testData.tag700, testData.field700Content);
                QuickMarcEditor.addNewField(testData.tag980, testData.field980Content, 5);
                QuickMarcEditor.checkContentByTag(testData.tag980, testData.field980Content);

                // Step 6: Click "Save & close" - should succeed
                QuickMarcEditor.pressSaveAndClose();

                // Verify successful save
                QuickMarcEditor.checkAfterSaveAndClose();
                InventoryInstance.checkInstanceTitle(instanceTitleEdited);
                InteractorsTools.checkNoErrorCallouts();
              });
          },
        );
      });
    });
  });
});
