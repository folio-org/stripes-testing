import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const tag001 = '001';
      const headerText = 'Create a new MARC authority record';
      const newField = {
        previousFieldTag: '008',
        tag: '111',
        content:
          '$a C423559 Autotest Create a new MARC authority record with Local authority file which includes default prefix in it',
      };
      const recordTitle =
        'C423559 Autotest Create a new MARC authority record with Local authority file which includes default prefix in it';
      const localAuthFile = {
        name: `C423559 auth source file active ${randomPostfix}`,
        prefix: `na${getRandomLetters(6)}`,
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
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
              localAuthFile.prefix,
              localAuthFile.startWithNumber,
              localAuthFile.name,
              localAuthFile.isActive,
            ).then((sourceId) => {
              localAuthFile.id = sourceId;
            });
          })
          .then(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C692052 Create a new MARC authority record with "Local" authority file selected which includes default prefix in it (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'shiftLeftBroken', 'C692052'] },
        () => {
          // 1 Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          QuickMarcEditor.verifyAuthorityLookUpButton();

          // 2 Click on "Authority file look-up" hyperlink
          QuickMarcEditor.clickAuthorityLookUpButton();

          // 3 Click on the "Select authority file" placeholder in "Authority file name" dropdown and select the "Local" option created by user in preconditions
          QuickMarcEditor.selectAuthorityFile(localAuthFile.name);
          QuickMarcEditor.verifyAuthorityFileSelected(localAuthFile.name);

          // 4 Click on the "Save & close" button
          QuickMarcEditor.clickSaveAndCloseInModal();
          QuickMarcEditor.checkFourthBoxEditable(1, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
          );

          // 5 Add 1 new field by clicking on "+" icon and fill it as specified:
          // 111 \\ "$a Create a new MARC authority record with Local authority file which includes default prefix in it"
          MarcAuthority.addNewFieldAfterExistingByTag(
            newField.previousFieldTag,
            newField.tag,
            newField.content,
          );
          QuickMarcEditor.checkContentByTag(newField.tag, newField.content);

          // 6 Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyAfterSaveAndClose();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(headerText);
          MarcAuthorities.verifyViewPaneContentExists();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;
          });
          MarcAuthority.contains(tag001);
          MarcAuthority.contains(`${localAuthFile.prefix}${localAuthFile.startWithNumber}`);
          MarcAuthority.contains(newField.tag);
          MarcAuthority.contains(newField.content);

          // 7 Close the detail view pane by clicking on "X" icon placed in the left upper corner of the pane
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyMarcViewPaneIsOpened(false);

          cy.reload();
          MarcAuthorities.waitLoading();
          // 8 Click on the "Authority source" multi select element in "Authority source" accordion placed on "Search & filter" pane
          MarcAuthorities.clickMultiSelectToggleButtonInAccordion('Authority source');
          MarcAuthorities.checkAuthoritySourceDropdownHasOption(localAuthFile.name);

          // 9 Click on the "Local" authority file created at preconditions in expanded dropdonw
          MarcAuthorities.chooseAuthoritySourceOption(localAuthFile.name);
          MarcAuthorities.checkSelectedAuthoritySource(localAuthFile.name);
          MarcAuthorities.checkAfterSearch('Authorized', recordTitle);
          MarcAuthorities.checkRecordDetailPageMarkedValue(recordTitle);
        },
      );
    });
  });
});
