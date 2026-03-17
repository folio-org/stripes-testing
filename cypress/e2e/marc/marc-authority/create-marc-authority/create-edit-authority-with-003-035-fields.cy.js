import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C1045404_MarcAuthority_${getRandomPostfix()}`,
        tags: {
          tag008: '008',
          tag003: '003',
          tag035: '035',
          tag010: '010',
          tag100: '100',
          tag400: '400',
        },
        tag008Index: 3,
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n1045404${randomDigits}${randomDigits}`,
        tag003Content: '$a new field',
        firstTag035Content: '$a (OCoLC)ocm000064758',
        secondTag035Content: '$a (OCoLC)on.000064759',
        thirdTag035Content:
          '$a (OCoLC)ocm000064758 $z (OCoLC)0000976939443 $z (OCoLC)ocn00001001261435 $z (OCoLC)120194933',
        tag400Content: '$a added field',
        userProperties: {},
      };

      const fields = [
        { tag: testData.tags.tag003, content: testData.tag003Content, id: 4 },
        { tag: testData.tags.tag035, content: testData.firstTag035Content, id: 5 },
        { tag: testData.tags.tag035, content: testData.secondTag035Content, id: 6 },
        { tag: testData.tags.tag035, content: testData.thirdTag035Content, id: 7 },
        { tag: testData.tags.tag010, content: `$a ${testData.naturalId}`, id: 8 },
        { tag: testData.tags.tag100, content: `$a ${testData.authorityHeading}`, id: 9 },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C1045404_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

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
      });

      it(
        'C1045404 Create/Edit MARC authority record with 003 and 035 fields (no normalization) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C1045404'] },
        () => {
          // Step 1: Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();

          // Step 2: Select authority source file
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          // Step 3: Select valid values in 008 field
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tags.tag008);
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tags.tag008, false);

          // Steps 4-6: Add 003, 035, 100 fields
          fields.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, testData.tag008Index + index);
          });
          fields.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });

          // Step 7: Click on the "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifySaveAndKeepEditingButtonDisabled();
          QuickMarcEditor.checkUserNameInHeader(
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          fields.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });

          // Step 8: Add new field
          QuickMarcEditor.addNewField(testData.tags.tag400, testData.tag400Content, 9);
          QuickMarcEditor.checkContentByTag(testData.tags.tag400, testData.tag400Content);

          // Step 9: Click on the "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifySaveAndKeepEditingButtonDisabled();
          cy.wait(3000);

          fields.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });
          QuickMarcEditor.checkContentByTag(testData.tags.tag400, testData.tag400Content);
        },
      );
    });
  });
});
