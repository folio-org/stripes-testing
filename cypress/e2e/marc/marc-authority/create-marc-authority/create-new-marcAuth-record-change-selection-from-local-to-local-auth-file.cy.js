import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const tag001 = '001';
      const tag008 = '008';
      const tag100 = '100';
      const tag001RowIndex = 1;
      const headerText = MarcAuthority.createAuthorityPaneTitleRegExp;
      const authorityHeading = `AT_C423550_MarcAuthority_${randomPostfix}`;
      const localAuthFile1 = {
        name: `AT_C423550_AuthoritySourceFile1_${randomPostfix}`,
        prefix: `${getRandomLetters(15)}a`,
        startWithNumber: '423550',
        isActive: true,
      };
      const localAuthFile2 = {
        name: `AT_C423550_AuthoritySourceFile2_${randomPostfix}`,
        prefix: `${getRandomLetters(15)}b`,
        startWithNumber: '423550',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423550_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423550_*').then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile1.prefix,
              localAuthFile1.startWithNumber,
              localAuthFile1.name,
              localAuthFile1.isActive,
            ).then((sourceId) => {
              localAuthFile1.id = sourceId;
            });
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile2.prefix,
              localAuthFile2.startWithNumber,
              localAuthFile2.name,
              localAuthFile2.isActive,
            ).then((sourceId) => {
              localAuthFile2.id = sourceId;
            });
          })
          .then(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile1.id, true);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile2.id, true);
      });

      it(
        'C423550 Change selection of authority file from "Local" to different "Local" and create a new MARC authority record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423550'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();

          // Step 2: Set valid 008 dropdown values
          MarcAuthority.setValid008DropdownValues();

          // Step 3: Add 100 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag100, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${authorityHeading}`);

          // Step 4: Select local authority file 1; verify 001 updated with its prefix
          MarcAuthority.selectSourceFile(localAuthFile1.name);
          QuickMarcEditor.checkFourthBoxEditable(tag001RowIndex, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile1.prefix}${localAuthFile1.startWithNumber}`,
          );

          // Step 5: Switch to local authority file 2; verify 001 updated with its prefix
          MarcAuthority.selectSourceFile(localAuthFile2.name);
          QuickMarcEditor.checkFourthBoxEditable(tag001RowIndex, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile2.prefix}${localAuthFile2.startWithNumber}`,
          );

          // Step 6: Save & close; verify record created with local file 2 prefix in 001
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;
            MarcAuthority.checkTagInRow(
              tag001RowIndex,
              `${localAuthFile2.prefix}${localAuthFile2.startWithNumber}`,
            );
          });
        },
      );
    });
  });
});
