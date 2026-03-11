import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const TAG = '002'; // Local control field tag
      let authSpecId;
      let localFieldId;

      const fieldPayload = {
        tag: TAG,
        label: 'AT Custom Field - Local Authority Subfield Test',
        url: 'http://www.example.org/field002.html',
        repeatable: false,
        required: false,
        deprecated: false,
      };
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C503161_MarcAuthority_${getRandomPostfix()}`,
        tag001: '001',
        tag002: '002',
        tag003: '003',
        tag004: '004',
        tag008: '008',
        tag009: '009',
        tag010: '010',
        tag100: '100',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n503161${randomDigits}${randomDigits}`,
      };

      const controlFieldContents = [
        { tag: testData.tag002, content: 'FOLIO23491' },
        { tag: testData.tag003, content: 'FOLIO23492' },
        { tag: testData.tag004, content: 'FOLIO23493' },
        { tag: testData.tag009, content: 'FOLIO23494' },
      ];

      const regularFieldContents = [
        { tag: testData.tag010, content: `$a ${testData.naturalId}` },
        { tag: testData.tag100, content: `$a ${testData.authorityHeading}` },
      ];

      const controlFieldContentsAfterSave = [
        { tag: testData.tag002, content: controlFieldContents[0].content },
        { tag: testData.tag003, content: controlFieldContents[1].content },
        { tag: testData.tag004, content: controlFieldContents[2].content },
        { tag: testData.tag009, content: controlFieldContents[3].content },
      ];

      const expectedSourceControlFields = controlFieldContentsAfterSave.map(
        (field) => `${field.tag}\t${field.content}`,
      );

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C503161_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.specificationStorageGetSpecificationFields.gui,
          Permissions.specificationStorageCreateSpecificationField.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.getSpecificationIds().then((specs) => {
            // Find the specification with profile 'authority'
            const authSpec = specs.find((s) => s.profile === 'authority');
            /* eslint-disable no-unused-expressions */
            expect(authSpec, 'MARC authority specification exists').to.exist;
            authSpecId = authSpec.id;

            // Clean up any existing field with the same tag and create a new one
            cy.deleteSpecificationFieldByTag(authSpecId, fieldPayload.tag, false).then(() => {
              cy.createSpecificationField(authSpecId, fieldPayload).then((fieldResp) => {
                expect(fieldResp.status).to.eq(201);
                localFieldId = fieldResp.body.id;
              });
            });
          });

          MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.authoritySourceFile);

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeading);
        Users.deleteViaApi(testData.userProperties.userId);
        if (localFieldId) {
          cy.deleteSpecificationFieldByTag(authSpecId, fieldPayload.tag, false);
        }
      });

      it(
        'C503161 Create "MARC authority" record with multiple Local control fields (002, 003, 004, 009) which dont have subfield "$a" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503161'] },
        () => {
          // 1. Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkButtonsDisabled();

          // 2. Click on "Select authority file" dropdown and select any "Folio" authority file, ex.: "LC Name Authority file (LCNAF)"
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          // 3. Select valid values in highlighted in red positions (dropdowns) of "008" field
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

          // 4. Add new fields by clicking on "+" icon and fill it as specified
          controlFieldContents.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, 3 + index);
          });
          controlFieldContents.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 4 + index);
          });
          regularFieldContents.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, 7 + index);
          });
          regularFieldContents.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 8 + index);
          });

          // 5. Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthorities.verifyViewPaneContentExists();
          expectedSourceControlFields.forEach((field) => {
            MarcAuthority.contains(field);
          });
          MarcAuthority.contains(testData.authorityHeading);

          // 6. Click on the "Actions" button in the third pane >> Select "Edit" option
          MarcAuthority.edit();
          controlFieldContentsAfterSave.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 4 + index);
          });
        },
      );
    });
  });
});
