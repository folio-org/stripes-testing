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

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instanceTitle = `AT_C552462_MarcBibInstance_${randomPostfix}`;

        const testData = {
          tag245: '245',
          tag700: '700',
          tag980: '980',
          field245Content: `$a ${instanceTitle}`,
          field700Content: '$a Required field',
          errorMessageField700Required: 'Field 700 is required.',
        };

        let centralSpecId;
        let memberSpecId;
        let user;
        let createdInstanceId;
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
          });

          if (user?.userId) Users.deleteViaApi(user.userId);
          if (createdInstanceId) {
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          }
        });

        it(
          'C552462 Created MARC bib record on Central tenant is verified against Central tenant rules (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C552462', 'nonParallel'] },
          () => {
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();

              // Setup Central tenant validation rules
              // Field 700 must be required on Central
              cy.getSpecificationFields(centralSpecId).then((response) => {
                const field700 = findStandardField(response.body.fields, testData.tag700);
                if (field700) {
                  centralField700Id = field700.id;
                  centralField700OriginalData = { ...field700 };

                  if (!field700.required) {
                    cy.updateSpecificationField(
                      centralField700Id,
                      {
                        ...field700,
                        required: true,
                      },
                      false,
                    );
                  }
                }

                // Field 980 must not exist on Central
                const existingField980 = findLocalField(response.body.fields, testData.tag980);
                if (existingField980) {
                  cy.deleteSpecificationField(existingField980.id, false);
                }
              });

              // Setup Member tenant validation rules
              cy.withinTenant(Affiliations.College, () => {
                // Field 700 must be NOT required on Member
                cy.getSpecificationFields(memberSpecId).then((response) => {
                  const field700 = findStandardField(response.body.fields, testData.tag700);
                  if (field700) {
                    memberField700Id = field700.id;
                    memberField700OriginalData = { ...field700 };

                    if (field700.required) {
                      cy.updateSpecificationField(
                        memberField700Id,
                        {
                          ...field700,
                          required: false,
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
                        label: `AT_C552462_Custom Field ${randomPostfix}`,
                        url: 'http://www.example.org/C552462field980.html',
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
                // Create user in Central tenant
                cy.createTempUser([
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                ]).then((userProperties) => {
                  user = userProperties;
                });
              })
              .then(() => {
                // Login to Central tenant
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

                // Step 1: Click Actions → New MARC bibliographic record
                InventoryInstance.newMarcBibRecord();
                QuickMarcEditor.waitLoading();

                // Step 2: Select valid values in LDR positions 06, 07
                // Step 3: Select values from 008 field dropdowns
                QuickMarcEditor.updateLDR06And07Positions();

                // Step 4: Fill in $a subfield of 245 field
                QuickMarcEditor.updateExistingField(testData.tag245, testData.field245Content);
                QuickMarcEditor.checkContentByTag(testData.tag245, testData.field245Content);

                // Step 5: Click "Save & close" - should show error for missing field 700
                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.checkCallout(testData.errorMessageField700Required);
                QuickMarcEditor.checkButtonsEnabled();

                // Step 6: Add required field 700
                QuickMarcEditor.addNewField(testData.tag700, testData.field700Content, 4);
                QuickMarcEditor.checkContentByTag(testData.tag700, testData.field700Content);

                // Step 7: Click "Save & close" - should succeed
                QuickMarcEditor.pressSaveAndCloseButton();

                // Verify successful save
                QuickMarcEditor.checkAfterSaveAndClose();
                InventoryInstance.checkInstanceTitle(instanceTitle);
                InventoryInstance.getId().then((id) => {
                  createdInstanceId = id;
                });
              });
          },
        );
      });
    });
  });
});
