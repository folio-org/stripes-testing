import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        tag010: '010',
        tag100: '100',
        tag008: '008',
        authorityPrefix: 'n',
        field010Content: `$a n${getRandomPostfix()}`,
        field100Content: '$a C523594 Create MARC authority and check modal',
        successMessage: 'Record created.',
      };
      const LC_NAME_AUTHORITY_FILE = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      let user;
      const dropdownSelections = {
        'Geo Subd': 'a',
        Roman: 'a',
        Lang: 'b',
        'Kind rec': 'a',
        'Cat Rules': 'b',
        'SH Sys': 'a',
        Series: 'b',
        'Numb Series': 'a',
        'Main use': 'a',
        'Subj use': 'a',
        'Series use': 'a',
        'Type Subd': 'a',
        'Govt Ag': 'a',
        RefEval: 'a',
        RecUpd: 'a',
        'Pers Name': 'b',
        'Level Est': 'a',
        'Mod Rec': 'a',
        Source: 'a',
      };

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            user = userProperties;
            MarcAuthorities.setAuthoritySourceFileActivityViaAPI(LC_NAME_AUTHORITY_FILE);
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C523594*');
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C523594*');
        Users.deleteViaApi(user.userId);
      });

      it(
        'C813642 "MARC validation rules check" modal appears during create of MARC authority record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813642'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.waitLoading();

          MarcAuthority.selectSourceFile(LC_NAME_AUTHORITY_FILE);

          MarcAuthority.select008DropdownsIfOptionsExist(dropdownSelections);

          QuickMarcEditor.addNewField(testData.tag010, testData.field010Content, 3);
          QuickMarcEditor.checkContent(testData.field010Content, 4);

          QuickMarcEditor.addNewField(testData.tag100, testData.field100Content, 4);
          QuickMarcEditor.checkContent(testData.field100Content, 5);

          QuickMarcEditor.simulateSlowNetwork('**/records-editor/validate', 5000);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifySlowInternetConnectionModal();
          cy.wait('@slowNetworkRequest');

          QuickMarcEditor.checkCallout(testData.successMessage);
          MarcAuthority.waitLoading();
        },
      );
    });
  });
});
