import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(2);
        const exisitngLccn = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const localAuthFile = {
          name: `C523574 auth source file active ${randomPostfix}`,
          prefix: `${randomLetters}`,
          hridStartsWith: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        };
        const sharedMarcAuthorityHeading = `AT_C523574_SharedMarcAuthority_${randomPostfix}`;
        const marcAuthorityFields = [
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeading}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${exisitngLccn}`,
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C523574');

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          ])
            .then((createdUser) => {
              user = createdUser;

              cy.createAuthoritySourceFileUsingAPI(
                localAuthFile.prefix,
                localAuthFile.hridStartsWith,
                localAuthFile.name,
              ).then(() => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  localAuthFile.prefix,
                  localAuthFile.hridStartsWith,
                  marcAuthorityFields[0],
                ).then((authorityId) => {
                  createdAuthorityId.push(authorityId);
                });

                cy.toggleLccnDuplicateCheck({ enable: false });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(localAuthFile.name);
          Users.deleteViaApi(user.userId);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C523574');
        });

        it(
          'C523574 Create MARC authority record with value in "010 $a" subfield which matches to other records "010 $a" and "010 $z" when duplicate LCCN check is disabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C523574'] },
          () => {
            // Step 1: Click on "Actions" button in second pane >> Select "+ New" option
            MarcAuthorities.clickActionsAndNewAuthorityButton();

            // Step 2: Click on the "Select authority file" placeholder in dropdown and select created by user "Local" option
            MarcAuthority.selectSourceFile(localAuthFile.name);
            QuickMarcEditor.checkContentByTag('001', `${localAuthFile.prefix}1`);

            // Step 3: Select valid values in highlighted in red positions (dropdowns) of "008" field
            MarcAuthority.setValid008DropdownValues();

            // Step 4: Add 100 and 010 fields
            QuickMarcEditor.addNewField('100', `$a ${sharedMarcAuthorityHeading}_5`, 3);
            QuickMarcEditor.addNewField('010', `$a ${exisitngLccn}`, 3);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          },
        );
      });
    });
  });
});
