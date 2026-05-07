import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  findStandardField,
  findStandardSubfield,
} from '../../../../../support/api/specifications-helper';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(10);
        const randomDigits = `566565${randomNDigitNumber(5)}`;
        const sourceFilePrefix = randomLetters;
        const rowIndex100 = 5;

        const testData = {
          tag008: '008',
          tag010: '010',
          tag100: '100',
          tag245: '245',
          bibTitle: `AT_C566565_MarcBibInstance_${randomPostfix}`,
          authorityPrefix: sourceFilePrefix,
          authorityNaturalId: randomDigits,
          authorityOriginalField100Content: '$a AT_C566565_Chin, Staceyann, $d 1972-',
          authorityUpdatedField100Content: '$a AT_C566565_Chin, Staceyann,',
          authorityOriginalHeading: 'AT_C566565_Chin, Staceyann, 1972-',
          bibOriginalField100Content: '$a AT_C566565_Chin, Staceyann, $d 1972-',
          bibField100LinkedControlled: '$a AT_C566565_Chin, Staceyann, $d 1972-',
          errorMessage: "Fail: Subfield 'd' is required.",
        };

        const linkedFieldData100 = {
          tag: testData.tag100,
          ind1: '1',
          ind2: '\\',
          controlledLetterSubfields: testData.bibField100LinkedControlled,
          uncontrolledLetterSubfields: '',
          controlledDigitSubfields: `$0 ${testData.authorityPrefix}${testData.authorityNaturalId}`,
          uncontrolledDigitSubfields: '',
        };

        let userData;
        let bibSpecId;
        let field100Id;
        let subfieldDId;
        let subfieldDOriginalData;
        let createdInstanceId;
        let createdAuthorityId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C566565_');

          cy.then(() => {
            // Get bib specification ID and configure validation rules
            getBibliographicSpec().then((bibSpec) => {
              bibSpecId = bibSpec.id;

              // Find field 100 and subfield $d
              cy.getSpecificationFields(bibSpecId).then((response) => {
                const field100 = findStandardField(response.body.fields, testData.tag100);
                if (field100) {
                  field100Id = field100.id;

                  cy.getSpecificationFieldSubfields(field100Id).then((subfieldResponse) => {
                    const subfieldD = findStandardSubfield(subfieldResponse.body.subfields, 'd');

                    if (subfieldD) {
                      subfieldDId = subfieldD.id;
                      subfieldDOriginalData = { ...subfieldD };

                      // Make $d required
                      if (!subfieldD.required) {
                        cy.updateSpecificationSubfield(
                          subfieldDId,
                          {
                            ...subfieldD,
                            required: true,
                          },
                          false,
                        );
                      }
                    }
                  });
                }
              });
            });
          })
            .then(() => {
              // Create MARC Authority with $d subfield
              MarcAuthorities.createMarcAuthorityViaAPI(
                testData.authorityPrefix,
                testData.authorityNaturalId,
                [
                  {
                    tag: testData.tag010,
                    content: `$a ${testData.authorityPrefix}${testData.authorityNaturalId}`,
                    indicators: ['\\', '\\'],
                  },
                  {
                    tag: testData.tag100,
                    content: testData.authorityOriginalField100Content,
                    indicators: ['1', '\\'],
                  },
                ],
              ).then((authorityId) => {
                createdAuthorityId = authorityId;
              });

              // Create MARC Bib
              const marcBibFields = [
                {
                  tag: testData.tag008,
                  content: QuickMarcEditor.valid008ValuesInstance,
                },
                {
                  tag: testData.tag245,
                  content: `$a ${testData.bibTitle}`,
                  indicators: ['1', '1'],
                },
                {
                  tag: testData.tag100,
                  content: testData.bibOriginalField100Content,
                  indicators: ['1', '\\'],
                },
              ];

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
            })
            .then(() => {
              // Link 100 field to authority via API
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: createdInstanceId,
                authorityIds: [createdAuthorityId],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [linkedFieldData100.controlledLetterSubfields],
              });
            })
            .then(() => {
              // Create test user
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]).then((userProperties) => {
                userData = userProperties;
              });
            });
        });

        after('Delete test data', () => {
          cy.getAdminToken();

          // Restore validation rules
          if (subfieldDId && subfieldDOriginalData) {
            cy.updateSpecificationSubfield(subfieldDId, { ...subfieldDOriginalData }, false);
          }

          // Delete created records
          if (createdAuthorityId) {
            MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          }
          if (createdInstanceId) {
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          }
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C566565 Delete required subfield from linked MARC bib field by automated linked update triggered from MARC authority record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C566565', 'nonParallel'] },
          () => {
            // Step 1: Navigate to MARC Authority app and search for the authority
            cy.login(userData.username, userData.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });

            MarcAuthorities.searchBy('Keyword', testData.authorityOriginalHeading);
            MarcAuthorities.checkResultList([testData.authorityOriginalHeading]);
            MarcAuthorities.selectTitle(testData.authorityOriginalHeading);
            MarcAuthority.waitLoading();

            // Step 2: Open "Edit MARC authority record" pane
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            // Step 3: Delete subfield "$d" from "100" field
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              testData.authorityUpdatedField100Content,
            );
            cy.wait(2000);

            // Step 4: Click "Save & close" (ignore Warn errors) >> Click "Save" in "Are you sure?" modal
            QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });

            // Step 5: Navigate to Inventory app and find linked MARC bibliographic
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();

            // Step 6: Edit MARC bibliographic record
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Step 7: Update any field (add $f test in editable box of linked 100 field)
            QuickMarcEditor.fillLinkedFieldBox(rowIndex100, 5, '$f test');

            // Verify field shows updated content (without $d after automated update)
            QuickMarcEditor.verifyTagFieldAfterLinking(
              rowIndex100,
              testData.tag100,
              '1',
              '\\',
              '$a AT_C566565_Chin, Staceyann,',
              '$f test',
              `$0 ${testData.authorityPrefix}${testData.authorityNaturalId}`,
              '',
            );

            // Step 8: Click "Save & keep editing" button
            QuickMarcEditor.clickSaveAndKeepEditingButton();

            // Step 9: Verify inline error message for missing required $d subfield
            QuickMarcEditor.checkErrorMessage(rowIndex100, testData.errorMessage);
            QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
            QuickMarcEditor.checkButtonSaveAndCloseEnable();
          },
        );
      });
    });
  });
});
