import { including } from '@interactors/html';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const localAuthFile = {
        name: `AT_C877079_AuthoritySourceFile_${randomPostfix}`,
        prefix: getRandomLetters(18),
        startWithNumber: '877079',
        isActive: true,
      };
      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag400: '400',
        naturalId: `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
        field100SubfieldAContent: `AT_C877079_MarcAuthority_${randomPostfix} back\\slash in middle. Test slash at the \\start and end\\. Test \\ lonely. Te\\\\st multiple\\\\. Test \\\\ multiple`,
        field400SubfieldAContent: 'test backsl\\ashes',
      };

      let user;
      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C877079_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C877079_*').then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            user = userProperties;
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
            // Wait for the scheduled job to process the new source file
            cy.wait(70000);
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
        cy.getAuthoritySourceFileDataViaAPI('AT_C877079_*').then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });
      });

      it(
        'C877079 Create/Edit MARC authority record with backslash ("\\") character in some fields and check detail view pane (promin)',
        { tags: ['extendedPath', 'promin', 'C877079'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(MarcAuthority.createAuthorityPaneTitleRegExp);
          MarcAuthority.checkSourceFileSelectShown();

          // Step 2: Select authority file and add 010 field
          MarcAuthority.selectSourceFile(localAuthFile.name);
          MarcAuthority.verifySourceFileSelected(localAuthFile.name);
          MarcAuthority.addNewFieldAfterExistingByTag(
            testData.tag008,
            testData.tag010,
            `$a ${testData.naturalId}`,
          );
          QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

          // Step 3: Set valid 008 dropdown values
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

          // Step 4: Add 100 field with backslash characters
          MarcAuthority.addNewFieldAfterExistingByTag(
            testData.tag010,
            testData.tag100,
            `$a ${testData.field100SubfieldAContent}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag100,
            `$a ${testData.field100SubfieldAContent}`,
          );

          // Step 5: Save & keep editing → record saved; 100 content preserved unchanged
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditingDerive();
          QuickMarcEditor.checkContentByTag(
            testData.tag100,
            `$a ${testData.field100SubfieldAContent}`,
          );

          // Step 6: Close pane; find record via search; verify heading in results and detail view
          QuickMarcEditor.close();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;
          });
          MarcAuthority.contains(`$a ${testData.field100SubfieldAContent}`);
          MarcAuthority.closeAuthorityViewPane();
          cy.wait(2000);

          MarcAuthorities.searchBeats(testData.field100SubfieldAContent);
          MarcAuthorities.checkRow(including(testData.field100SubfieldAContent));
          MarcAuthorities.selectIncludingTitle(testData.field100SubfieldAContent);
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;
          });
          MarcAuthority.contains(`$a ${testData.field100SubfieldAContent}`);

          // Step 7: Open edit mode
          MarcAuthority.edit();

          // Step 8: Add 400 field with backslash characters
          MarcAuthority.addNewFieldAfterExistingByTag(
            testData.tag100,
            testData.tag400,
            `$a ${testData.field400SubfieldAContent}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag400,
            `$a ${testData.field400SubfieldAContent}`,
          );

          // Step 9: Save & close → verify heading and field contents preserved in detail view and results
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthorities.checkRow(including(testData.field100SubfieldAContent));
          MarcAuthority.contains(testData.field100SubfieldAContent);
          MarcAuthority.contains(testData.field400SubfieldAContent);
        },
      );
    });
  });
});
