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
    describe('Derive MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instanceTitle = `AT_C552470_MarcBibInstance_${randomPostfix}`;
        const instanceTitleDerived = `${instanceTitle} test`;

        const testData = {
          tag008: '008',
          tag245: '245',
          tag700: '700',
          tag980: '980',
          field245OriginalContent: `$a ${instanceTitle}`,
          field245DerivedContent: `$a ${instanceTitleDerived}`,
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
        let derivedInstanceId;
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
          if (sourceInstanceId) InventoryInstance.deleteInstanceViaApi(sourceInstanceId);
          if (derivedInstanceId) InventoryInstance.deleteInstanceViaApi(derivedInstanceId);
        });

        it(
          'C552470 Derived MARC bib record on Central tenant is verified against Central tenant rules (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C552470', 'nonParallel'] },
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
                        label: `AT_C552470_Custom Field ${randomPostfix}`,
                        url: 'http://www.example.org/C552470field980.html',
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

              // Create source MARC bib via API
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceIdValue) => {
                  sourceInstanceId = instanceIdValue;
                },
              );
            })
              .then(() => {
                // Create user in Central tenant
                cy.createTempUser([
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
                  Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
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

                // Navigate to source instance
                InventoryInstances.searchByTitle(sourceInstanceId);
                InventoryInstances.selectInstanceById(sourceInstanceId);
                InventoryInstance.waitLoading();

                // Step 1: Click Actions → Derive new MARC bibliographic record
                InventoryInstance.deriveNewMarcBibRecord();
                QuickMarcEditor.waitLoading();

                // Step 2: Update $a subfield of 245 field
                QuickMarcEditor.updateExistingField(
                  testData.tag245,
                  testData.field245DerivedContent,
                );
                QuickMarcEditor.checkContentByTag(testData.tag245, testData.field245DerivedContent);

                // Step 3: Make sure no field 700 exists and no undefined fields
                QuickMarcEditor.checkTagAbsent(testData.tag700);

                // Step 4: Click "Save & close" - should succeed (700 not required on Central)
                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.checkAfterSaveAndCloseDerive();
                InventoryInstance.checkInstanceTitle(instanceTitleDerived);
                InventoryInstance.getId().then((id) => {
                  derivedInstanceId = id;
                });
              });
          },
        );
      });
    });
  });
});
