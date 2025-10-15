import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../support/constants';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Delete Authority', () => {
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C436897_MarcAuthority_${getRandomPostfix()}`,
        tag010: '010',
        tag151: '151',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n436897${randomDigits}${randomDigits}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C436897_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
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
        'C436897 Delete created from UI "MARC authority" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436897'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.setValid008DropdownValues();
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          for (let i = 0; i < 2; i++) {
            QuickMarcEditor.addEmptyFields(3 + i);
          }
          cy.wait(1000);

          QuickMarcEditor.addValuesToExistingField(
            3,
            testData.tag151,
            `$a ${testData.authorityHeading}`,
            '\\',
            '\\',
          );
          QuickMarcEditor.addValuesToExistingField(
            4,
            testData.tag010,
            `$a ${testData.naturalId}`,
            '\\',
            '\\',
          );

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.authorityHeading);

          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();
          MarcAuthoritiesDelete.confirmDelete();
          MarcAuthoritiesDelete.checkDelete(testData.authorityHeading);
          MarcAuthorities.checkDefaultSearchOptions();

          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthoritiesDelete.checkEmptySearchResults(testData.authorityHeading);
        },
      );
    });
  });
});
