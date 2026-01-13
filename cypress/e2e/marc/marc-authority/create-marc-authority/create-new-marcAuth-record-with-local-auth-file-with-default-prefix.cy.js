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
      const headerText = /Create a new .*MARC authority record/;
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
              authRefresh: true,
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
        'C813623 Create a new MARC authority record with "Local" authority file selected which includes default prefix in it (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'shiftLeftBroken', 'C813623'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          MarcAuthority.selectSourceFile(localAuthFile.name);

          QuickMarcEditor.checkFourthBoxEditable(1, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
          );

          MarcAuthority.addNewFieldAfterExistingByTag(
            newField.previousFieldTag,
            newField.tag,
            newField.content,
          );
          QuickMarcEditor.checkContentByTag(newField.tag, newField.content);

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

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyMarcViewPaneIsOpened(false);

          cy.reload();
          MarcAuthorities.waitLoading();

          MarcAuthorities.clickMultiSelectToggleButtonInAccordion('Authority source');
          MarcAuthorities.checkAuthoritySourceDropdownHasOption(localAuthFile.name);

          MarcAuthorities.chooseAuthoritySourceOption(localAuthFile.name);
          MarcAuthorities.checkSelectedAuthoritySource(localAuthFile.name);
          MarcAuthorities.checkAfterSearch('Authorized', recordTitle);
          MarcAuthorities.checkRecordDetailPageMarkedValue(recordTitle);
        },
      );
    });
  });
});
