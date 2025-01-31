import Permissions from '../../../support/dictionary/permissions';
import { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import { APPLICATION_NAMES, DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';

describe('Data Export', () => {
  describe('Export of Shared MARC authority record', () => {
    const sourceName = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
    const users = {};
    const authorityIdentifier = 'n2009073240';
    const newFields = [
      { previousFieldTag: '008', tag: '010', content: `$a ${authorityIdentifier}` },
      { previousFieldTag: '010', tag: '035', content: '$a 794564', ind1: '1', ind2: '2' },
      {
        previousFieldTag: '035',
        tag: '100',
        content: '$a C436898John Doe $c Sir, $d 1909-1965 $l eng',
      },
      {
        previousFieldTag: '100',
        tag: '400',
        content: '$a C436898Huan Doe $c Senior, $d 1909-1965 $l eng',
      },
      { previousFieldTag: '400', tag: '500', content: '$a C436898La familia' },
    ];
    const exportedInstanceFileName = `C436898 exportedMarcAuthFile${getRandomPostfix()}.mrc`;

    before('Create users, data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authorityIdentifier);
      MarcAuthorities.setAuthoritySourceFileActivityViaAPI(sourceName);
      cy.createTempUser([
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
      ]).then((userProperties) => {
        users.userProperties = userProperties;

        cy.login(users.userProperties.username, users.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        }).then(() => {
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      if (users.userProperties?.userId) Users.deleteViaApi(users.userProperties.userId);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authorityIdentifier);
      FileManager.deleteFileFromDownloadsByMask(['QuickAuthorityExport*']);
      FileManager.deleteFileFromDownloadsByMask(exportedInstanceFileName);
      FileManager.deleteFile(`cypress/fixtures/${exportedInstanceFileName}`);
    });

    it(
      'C436898 Export of created Shared MARC authority record from Central tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C436898'] },
      () => {
        MarcAuthorities.clickActionsAndNewAuthorityButton();
        QuickMarcEditor.checkPaneheaderContains('Create a new shared MARC authority record');
        QuickMarcEditor.verifyAuthorityLookUpButton();
        QuickMarcEditor.clickAuthorityLookUpButton();
        QuickMarcEditor.selectAuthorityFile(sourceName);
        QuickMarcEditor.verifyAuthorityFileSelected(sourceName);
        QuickMarcEditor.clickSaveAndCloseInModal();

        newFields.forEach((newField) => {
          MarcAuthority.addNewFieldAfterExistingByTag(
            newField.previousFieldTag,
            newField.tag,
            newField.content,
            newField.ind1 || '\\',
            newField.ind2 || '\\',
          );
        });
        QuickMarcEditor.checkContentByTag('001', authorityIdentifier);
        QuickMarcEditor.pressSaveAndClose();
        cy.wait(1500);
        QuickMarcEditor.pressSaveAndClose();
        MarcAuthority.verifyAfterSaveAndClose();

        MarcAuthorities.closeMarcViewPane();
        MarcAuthorities.searchBy('Keyword', authorityIdentifier);

        cy.intercept('/data-export/quick-export').as('getHrid');
        MarcAuthorities.checkSelectAuthorityRecordCheckbox('C436898La familia');
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();

        cy.wait('@getHrid', 10_000).then((resp) => {
          const exportedHrid = resp.response.body.jobExecutionHrId;
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.waitLandingPageOpened();
          ExportFile.downloadExportedMarcFileWithRecordHrid(exportedHrid, exportedInstanceFileName);
          ExportFile.verifyFileIncludes(exportedInstanceFileName, [
            'an 2009073240',
            '12a794564',
            'aC436898John DoecSir,d1909-1965leng',
            'aC436898Huan DoecSenior,d1909-1965leng',
            'aC436898La familia',
          ]);
        });
      },
    );
  });
});
