import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomDigits = randomNDigitNumber(17);
      const testData = {
        authorityHeading: `AT_C423525_MarcAuthority_${getRandomPostfix()}`,
        tag008: '008',
        tag010: '010',
        tag100: '100',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n423525${randomDigits}${randomDigits}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423525_');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          ManageAuthorityFiles.setAuthorityFileToActiveViaApi(testData.authoritySourceFile);

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(testData.authoritySourceFile);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeadingPrefix);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C423525 Detail view of created "MARC authority" record is open automatically after creation when user is on search result list with one result (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423525'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008);
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          for (let i = 0; i < 2; i++) {
            QuickMarcEditor.addEmptyFields(3 + i);
            QuickMarcEditor.checkEmptyFieldAdded(3 + i + 1);
          }
          cy.wait(1000);

          QuickMarcEditor.addValuesToExistingField(
            3,
            testData.tag010,
            `$a ${testData.naturalId}`,
            '\\',
            '\\',
          );
          QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);
          QuickMarcEditor.addValuesToExistingField(
            4,
            testData.tag100,
            `$a ${testData.authorityHeading}`,
            '1',
            '\\',
          );
          QuickMarcEditor.checkContentByTag(testData.tag100, `$a ${testData.authorityHeading}`);

          MarcAuthority.saveWithShortcut();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.authorityHeading);
        },
      );
    });
  });
});
