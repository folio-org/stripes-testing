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
      const heading1 = `AT_C423554_MarcAuthority1_${randomPostfix}`;
      const heading2 = `AT_C423554_MarcAuthority2_${randomPostfix}`;
      const localAuthFile = {
        name: `AT_C423554_AuthoritySourceFile_${randomPostfix}`,
        prefix: `${getRandomLetters(20)}h`,
        startWithNumber: 1,
        isActive: true,
      };
      // User B's record fields — created via API to simulate concurrent HRID reservation
      const marcAuthFieldsB = [{ tag: '100', content: `$a ${heading2}`, indicators: ['1', '\\'] }];
      const users = {};
      let createdAuthorityIdA;
      let createdAuthorityIdB;

      before('Create user and local authority file', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423554_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423554_*').then(() => {
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
            users.userPropertiesA = userProperties;
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
            ]).then((userProperties) => {
              users.userPropertiesB = userProperties;
            });
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile.prefix,
              localAuthFile.startWithNumber,
              localAuthFile.name,
              localAuthFile.isActive,
            ).then((sourceId) => {
              localAuthFile.id = sourceId;
            });
          })
          .then(() => {
            cy.wait(70_000); // wait for created source files to be processed by scheduled job
            cy.login(users.userPropertiesA.username, users.userPropertiesA.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userPropertiesA?.userId);
        Users.deleteViaApi(users.userPropertiesB?.userId);
        if (createdAuthorityIdA) MarcAuthority.deleteViaAPI(createdAuthorityIdA, true);
        if (createdAuthorityIdB) MarcAuthority.deleteViaAPI(createdAuthorityIdB, true);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423554 Create 2 new MARC authority records with "Local" authority file selected at the same time (promin)',
        { tags: ['extendedPath', 'promin', 'C423554'] },
        () => {
          // Steps 1-2: User A opens new record form, sets valid 008 values
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(tag008, false);

          // Step 3: User A selects local authority file; 001 auto-populated with HRID 1
          MarcAuthority.selectSourceFile(localAuthFile.name);
          QuickMarcEditor.checkFourthBoxEditable(tag001RowIndex, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
          );

          // Step 4: User A adds 100 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag100, `$a ${heading1}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${heading1}`);

          // Step 9: User A saves; verify HRID 1 is preserved (not overwritten by User B's creation)
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityIdA = id;
            MarcAuthority.checkTagInRow(
              tag001RowIndex,
              `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
            );
          });

          // Steps 5-8, 10: User B opens form and selects same local file simultaneously.
          // Cypress cannot open a second browser tab, so User B's record is created via API.
          // HRID '2' is the next sequence number after User A reserved '1'.
          cy.getToken(users.userPropertiesB.username, users.userPropertiesB.password);
          MarcAuthorities.createMarcAuthorityViaAPI(
            localAuthFile.prefix,
            '2',
            marcAuthFieldsB,
          ).then((id) => {
            createdAuthorityIdB = id;

            cy.getMarcRecordDataViaAPI(createdAuthorityIdB).then((marcData) => {
              const field001 = marcData.fields.find((f) => f.tag === tag001);
              expect(field001.content).to.eq(
                `${localAuthFile.prefix}${localAuthFile.startWithNumber + 1}`,
              );
            });
          });
        },
      );
    });
  });
});
