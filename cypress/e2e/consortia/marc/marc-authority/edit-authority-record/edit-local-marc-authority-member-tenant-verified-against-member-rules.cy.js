import { including } from '@interactors/html';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import {
  getAuthoritySpec,
  findStandardField,
  findLocalField,
} from '../../../../../support/api/specifications-helper';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          tag100: '100',
          tag500: '500',
          tag980: '980',
          authorityNaturalId: `n552479${randomPostfix}`,
          authorityHeadingPrefix: `AT_C552479_MarcAuthority_${randomPostfix}`,
          requiredField980Content1: '$a Required field 1',
          requiredField980Content2: '$a Required field 2',
          errorRequired980: 'Field 980 is required.',
          errorNonRepeatable: 'Fail: Field is non-repeatable.',
          field100Index: 4,
        };

        const auth100Content = `$a ${testData.authorityHeadingPrefix}`;
        const auth100UpdatedContent = `$a ${testData.authorityHeadingPrefix} FirstUpdate`;

        const userPermissions = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ];

        let user;
        let centralSpecId;
        let memberSpecId;
        let centralField500Id;
        let centralField500OriginalData;
        let memberField980Id;
        let memberField500Id;
        let memberField500OriginalData;
        let authorityId;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Get specification IDs for both tenants
          getAuthoritySpec().then((centralAuthSpec) => {
            centralSpecId = centralAuthSpec.id;
            cy.syncSpecifications(centralAuthSpec.id);
          });

          cy.withinTenant(Affiliations.College, () => {
            getAuthoritySpec().then((memberAuthSpec) => {
              memberSpecId = memberAuthSpec.id;
              cy.syncSpecifications(memberSpecId);
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Restore Central tenant field 500 to not required
          if (centralField500Id && centralField500OriginalData) {
            cy.updateSpecificationField(
              centralField500Id,
              { ...centralField500OriginalData, required: false },
              false,
            );
          }
          cy.syncSpecifications(centralSpecId);

          // Restore Member tenant validation rules
          cy.withinTenant(Affiliations.College, () => {
            if (memberField500Id && memberField500OriginalData) {
              cy.updateSpecificationField(
                memberField500Id,
                { ...memberField500OriginalData, required: false },
                false,
              );
            }
            if (memberField980Id) {
              cy.deleteSpecificationField(memberField980Id, false);
            }
            cy.syncSpecifications(memberSpecId);
          });

          cy.setTenant(Affiliations.College);
          if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
          if (user?.userId) Users.deleteViaApi(user.userId);
        });

        it(
          'C552479 Edited Local MARC authority record on Member tenant is verified against Member tenant rules (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C552479', 'nonParallel'] },
          () => {
            cy.then(() => {
              cy.getAdminToken();
              cy.setTenant(Affiliations.College);
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C552479_');

              // Create local MARC authority record in College (Member) with only 100 field
              MarcAuthorities.createMarcAuthorityViaAPI('', testData.authorityNaturalId, [
                {
                  tag: testData.tag100,
                  content: auth100Content,
                  indicators: ['1', '\\'],
                },
              ]).then((id) => {
                authorityId = id;
              });
            })
              .then(() => {
                // Setup Central tenant validation rules:
                // Field 500 must be REQUIRED on Central
                cy.resetTenant();
                cy.getSpecificationFields(centralSpecId).then((response) => {
                  const field500 = findStandardField(response.body.fields, testData.tag500);
                  if (field500) {
                    centralField500Id = field500.id;
                    centralField500OriginalData = { ...field500 };

                    if (!field500.required) {
                      cy.updateSpecificationField(
                        centralField500Id,
                        { ...field500, required: true },
                        false,
                      );
                    }
                  }

                  // Field 980 must NOT exist on Central (delete if exists)
                  const existingField980 = findLocalField(response.body.fields, testData.tag980);
                  if (existingField980) {
                    cy.deleteSpecificationField(existingField980.id, false);
                  }
                });

                // Setup Member tenant validation rules:
                // Field 500 must be NOT required on Member
                // Field 980 must be required and NOT repeatable on Member
                cy.withinTenant(Affiliations.College, () => {
                  cy.getSpecificationFields(memberSpecId).then((response) => {
                    const field500 = findStandardField(response.body.fields, testData.tag500);
                    if (field500) {
                      memberField500Id = field500.id;
                      memberField500OriginalData = { ...field500 };

                      if (field500.required) {
                        cy.updateSpecificationField(
                          memberField500Id,
                          { ...field500, required: false },
                          false,
                        );
                      }
                    }

                    const existingField980 = findLocalField(response.body.fields, testData.tag980);
                    if (existingField980) {
                      memberField980Id = existingField980.id;
                      if (!existingField980.required || existingField980.repeatable) {
                        cy.updateSpecificationField(
                          memberField980Id,
                          { ...existingField980, required: true, repeatable: false },
                          false,
                        );
                      }
                    } else {
                      cy.createSpecificationField(
                        memberSpecId,
                        {
                          tag: testData.tag980,
                          label: `AT_C552479_Custom_Field_${randomPostfix}`,
                          url: 'http://www.example.org/C552479field980.html',
                          repeatable: false,
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
                // Create user in College (Member) tenant — primary affiliation = College
                cy.setTenant(Affiliations.College);
                cy.createTempUser(userPermissions).then((userProperties) => {
                  user = userProperties;

                  // Assign Central tenant permissions (Central affiliation is automatic)
                  cy.resetTenant();
                  cy.assignPermissionsToExistingUser(user.userId, userPermissions);
                });
              })
              .then(() => {
                // Login to Member (College) tenant
                cy.setTenant(Affiliations.College);
                cy.login(user.username, user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                  authRefresh: true,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

                // Precondition: Search for authority record and open it
                MarcAuthorities.searchBeats(testData.authorityHeadingPrefix);
                MarcAuthorities.selectAuthorityById(authorityId);
                MarcAuthority.waitLoading();
                MarcAuthority.verifyLocalAuthorityDetailsHeading(testData.authorityHeadingPrefix);

                // Step 1: Click "Actions" > "Edit" to open MARC editor
                MarcAuthority.edit();
                QuickMarcEditor.waitLoading();

                // Step 2: Update $a subfield of 1XX field
                QuickMarcEditor.updateExistingField(testData.tag100, auth100UpdatedContent);
                QuickMarcEditor.checkContentByTag(testData.tag100, auth100UpdatedContent);

                // Step 3: Make sure record doesn't have 500 or 980 fields
                QuickMarcEditor.checkTagAbsent(testData.tag500);
                QuickMarcEditor.checkTagAbsent(testData.tag980);

                // Step 4: Click "Save & close" — should fail because field 980 is required on Member
                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.checkCallout(including(testData.errorRequired980));
                QuickMarcEditor.closeAllCallouts();

                // Step 5: Add TWO 980 fields
                QuickMarcEditor.addNewField(
                  testData.tag980,
                  testData.requiredField980Content1,
                  testData.field100Index,
                );
                QuickMarcEditor.checkContent(
                  testData.requiredField980Content1,
                  testData.field100Index + 1,
                );
                QuickMarcEditor.addNewField(
                  testData.tag980,
                  testData.requiredField980Content2,
                  testData.field100Index + 1,
                );
                QuickMarcEditor.checkContent(
                  testData.requiredField980Content2,
                  testData.field100Index + 2,
                );

                // Step 6: Click "Save & close" — should fail because field 980 is non-repeatable
                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.checkErrorMessageForField(
                  testData.field100Index + 2,
                  including(testData.errorNonRepeatable),
                );
                QuickMarcEditor.verifyValidationCallout();
                QuickMarcEditor.closeAllCallouts();

                // Step 7: Delete the second 980 field (at index field100Index + 2)
                QuickMarcEditor.deleteField(testData.field100Index + 2);
                QuickMarcEditor.verifyNoFieldWithContent(testData.requiredField980Content2);

                // Step 8: Click "Save & close" — should succeed
                QuickMarcEditor.pressSaveAndClose();
                MarcAuthority.waitLoading();
                MarcAuthority.contains(auth100UpdatedContent);
                InteractorsTools.checkNoErrorCallouts();
              });
          },
        );
      });
    });
  });
});
