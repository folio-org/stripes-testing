import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import { parseSanityParameters } from '../../../support/utils/users';

describe('Data Export', () => {
  describe('Export of Shared MARC authority record', () => {
    const LC_NAME_AUTHORITY_FILE = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
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
    const rawMrcFileData = [
      'an 2009073240',
      '12a794564',
      'aC436898John DoecSir,d1909-1965leng',
      'aC436898Huan DoecSenior,d1909-1965leng',
      'aC436898La familia',
    ];

    const { user, centralTenant, memberTenant } = parseSanityParameters();

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.setTenant(centralTenant.id);

      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authorityIdentifier);
      MarcAuthorities.setAuthoritySourceFileActivityViaAPI(LC_NAME_AUTHORITY_FILE);

      cy.setTenant(memberTenant.id);
      cy.getToken(user.username, user.password);
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(centralTenant.id);

      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authorityIdentifier);
      FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*');
      FileManager.deleteFileFromDownloadsByMask(exportedInstanceFileName);
      FileManager.deleteFile(`cypress/fixtures/${exportedInstanceFileName}`);
    });

    it(
      'C436898 C436899 Export of created Shared MARC authority record from Central and Member tenant (consortia) (spitfire)',
      { tags: ['sanity', 'C436898', 'C436899'] },
      () => {
        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });

        // User logs in to member tenant by default (primary affiliation)
        // Switch to central tenant to create authority record
        ConsortiumManager.switchActiveAffiliation(memberTenant.name, centralTenant.name);
        cy.setTenant(centralTenant.id);
        ConsortiumManager.checkCurrentTenantInTopMenu(centralTenant.name);

        MarcAuthorities.clickActionsAndNewAuthorityButton();
        QuickMarcEditor.checkPaneheaderContains('Create a new shared MARC authority record');
        MarcAuthority.checkSourceFileSelectShown();
        MarcAuthority.selectSourceFile(LC_NAME_AUTHORITY_FILE);
        MarcAuthority.setValid008DropdownValues();

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

        // Check Shared MARC authority export on Central tenant
        cy.intercept('/data-export/quick-export').as('getHrid');
        MarcAuthorities.checkSelectAuthorityRecordCheckbox('C436898La familia');
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();

        cy.wait('@getHrid', 10_000).then(
          ({
            response: {
              body: { jobExecutionHrId },
            },
          }) => {
            ExportFile.downloadExportedMarcFileWithRecordHrid(
              jobExecutionHrId,
              exportedInstanceFileName,
            );
            ExportFile.verifyFileIncludes(exportedInstanceFileName, rawMrcFileData);
          },
        );

        ConsortiumManager.switchActiveAffiliation(centralTenant.name, memberTenant.name);
        cy.setTenant(memberTenant.id);

        ConsortiumManager.checkCurrentTenantInTopMenu(memberTenant.name);
        MarcAuthorities.searchBy('Keyword', authorityIdentifier);

        MarcAuthorities.checkSelectAuthorityRecordCheckbox('C436898La familia');
        cy.intercept('/data-export/quick-export').as('getHrid');
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();

        cy.wait('@getHrid', 10_000).then(
          ({
            response: {
              body: { jobExecutionHrId },
            },
          }) => {
            ExportFile.downloadExportedMarcFileWithRecordHrid(
              jobExecutionHrId,
              exportedInstanceFileName,
            );
            ExportFile.verifyFileIncludes(exportedInstanceFileName, rawMrcFileData);
          },
        );
      },
    );
  });
});
