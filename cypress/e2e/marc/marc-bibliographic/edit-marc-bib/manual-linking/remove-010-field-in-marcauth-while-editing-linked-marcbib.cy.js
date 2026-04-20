import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = `397387${randomNDigitNumber(15)}`;
        const authority010NaturalId = { prefix: 'nr', value: `${randomDigits}1` };
        const authority001NaturalId = { prefix: '', value: `${randomDigits}2` };
        const sourceUrlPrefix = 'http://id.loc.gov/authorities/names/';

        const testData = {
          tag010: '010',
          tag151: '151',
          tag245: '245',
          tag651: '651',
          bibTitle: `AT_C397387_MarcBibInstance_${randomPostfix}`,
          authorityField151Content: `$a AT_C397387_MarcAuthority_${randomPostfix}`,
          authorityHeading: `AT_C397387_MarcAuthority_${randomPostfix}`,
          authority010FieldValue: `$a ${authority010NaturalId.prefix}${authority010NaturalId.value}`,
          initial$0AfterLinking: `$0 ${sourceUrlPrefix}${authority010NaturalId.prefix}${authority010NaturalId.value}`,
          expected$0AfterDelete: `$0 ${authority001NaturalId.prefix}${authority001NaturalId.value}`,
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.GEOGRAPHIC_NAME,
        };

        const marcBibFields = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tag651,
            content: testData.authorityField151Content,
            indicators: ['\\', '0'],
          },
        ];

        let userData;
        let testInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397387');

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              testInstanceId = instanceId;
            },
          );

          MarcAuthorities.createMarcAuthorityViaAPI(
            authority001NaturalId.prefix,
            authority001NaturalId.value,
            [
              {
                tag: testData.tag010,
                content: testData.authority010FieldValue,
                indicators: ['\\', '\\'],
              },
              {
                tag: testData.tag151,
                content: testData.authorityField151Content,
                indicators: ['\\', '\\'],
              },
            ],
          ).then((authorityId) => {
            testData.authorityId = authorityId;
          });

          // additional authority to be sure detail view of the main one won't auto-open in browse
          MarcAuthorities.createMarcAuthorityViaAPI(
            authority001NaturalId.prefix,
            `1${authority001NaturalId.value}`,
            [
              {
                tag: testData.tag151,
                content: `$a AT_C397387_MarcAuthority_Extra_${randomPostfix}`,
                indicators: ['\\', '\\'],
              },
            ],
          ).then((authorityId) => {
            testData.extraAuthorityId = authorityId;
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            userData = userProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(testData.authorityId, true);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.bibTitle);
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C397387 Removing "010" field in linked "MARC Authority" record while "MARC Bib" record being edited (NOT saved link; "$0" = "010 $a") (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C397387'] },
          () => {
            // Step 1: Open Edit MARC bib record
            InventoryInstances.searchByTitle(testInstanceId);
            InventoryInstances.selectInstanceById(testInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Step 2: Click link icon on 651 field
            InventoryInstance.verifyAndClickLinkIcon(testData.tag651);
            MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityField151Content);

            // Step 3: Link the authority
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag651);
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.tag651,
              '\\',
              '0',
              testData.authorityField151Content,
              '',
              testData.initial$0AfterLinking,
              '',
            );

            // Steps 4-7 (via API): delete 010 field from the authority
            cy.getMarcRecordDataViaAPI(testData.authorityId).then((marcData) => {
              marcData.fields = marcData.fields.filter((f) => f.tag !== testData.tag010);
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);

                  // Step 8: Save & keep editing the MARC bib
                  QuickMarcEditor.clickSaveAndKeepEditing();

                  // Verify $0 updated to the 001 value of the authority (no longer URL-based)
                  QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                    testData.tag651,
                    '\\',
                    '0',
                    testData.authorityField151Content,
                    '',
                    testData.expected$0AfterDelete,
                    '',
                  );
                },
              );
            });
          },
        );
      });
    });
  });
});
