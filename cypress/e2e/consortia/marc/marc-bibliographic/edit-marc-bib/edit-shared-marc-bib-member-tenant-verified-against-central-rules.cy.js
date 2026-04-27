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
        const instanceTitle = `AT_C552469_MarcBibInstance_${randomPostfix}`;
        const instanceTitleEdited = `${instanceTitle} test`;

        const testData = {
          tag008: '008',
          tag245: '245',
          tag700: '700',
          tag980: '980',
          field245OriginalContent: `$a ${instanceTitle}`,
          field245EditedContent: `$a ${instanceTitleEdited}`,
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
        let centralField700OriginalData;
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
          if (centralField700Id && centralField700OriginalData) {
            cy.updateSpecificationField(
              centralField700Id,
              { ...centralField700OriginalData, required: false },
              false,
            );
          }
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
          });

          if (sourceInstanceId) {
            InventoryInstance.deleteInstanceViaApi(sourceInstanceId);
          }
        });

        it(
          'C552469 Edited Shared MARC bib record on Member tenant is verified against Central tenant rules (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C552469', 'nonParallel'] },
          () => {
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();

              // Setup Central tenant validation rules
              // Field 700 must be NOT required on Central
              cy.getSpecificationFields(centralSpecId).then((response) => {
                const field700 = findStandardField(response.body.fields, testData.tag700);
                if (field700) {
                  centralField700Id = field700.id;
                  centralField700OriginalData = { ...field700 };

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
                        label: `AT_C552469_Custom Field ${randomPostfix}`,
                        url: 'http://www.example.org/C552469field980.html',
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

              // Create source Shared MARC bib via API on Central tenant
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceIdValue) => {
                  sourceInstanceId = instanceIdValue;
                },
              );
            })
              .then(() => {
                // Create user in Member tenant
                cy.setTenant(Affiliations.College);
                cy.createTempUser([
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                ]).then((userProperties) => {
                  user = userProperties;

                  cy.resetTenant();
                  cy.assignPermissionsToExistingUser(user.userId, [
                    Permissions.inventoryAll.gui,
                    Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                  ]);
                });
              })
              .then(() => {
                // Login to Member tenant
                cy.setTenant(Affiliations.College);
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

                // Navigate to source Shared instance
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

                // Step 4: Click "Save & close" - should succeed (no error for missing 700 on Central)
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
