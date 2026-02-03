import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      let createdAuthorityID;
      const testData = {
        authority: {
          searchInput: 'C376592 Robinson, Peter',
          searchOption: 'Keyword',
        },
        field010: { tag: '010', subfield1: '$a n90635366', subfield2: '$a n90635377' },
        errorMultiple010Subfields: "Subfield 'a' is non-repeatable",
      };
      const authorityPostfix = '?authRefType=Authorized&heading';
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFile = {
        marc: 'marcAuthFileForC376592.mrc',
        fileName: `C376592 testMarcFile.${getRandomPostfix()}.mrc`,
      };

      before('Upload files', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C376592');
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              createdAuthorityID = response[0].authority.id;
            },
          );
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityID);
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
      });

      it(
        'C376592 Add multiple "$a" to "010" field in "MARC Authority" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C376592'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);
          MarcAuthorities.select(`${createdAuthorityID}${authorityPostfix}`);
          MarcAuthority.edit();
          QuickMarcEditor.addNewField(
            testData.field010.tag,
            `${testData.field010.subfield1} ${testData.field010.subfield2}`,
            4,
          );
          QuickMarcEditor.verifyTagValue(5, testData.field010.tag);
          QuickMarcEditor.checkContent(
            `${testData.field010.subfield1} ${testData.field010.subfield2}`,
            5,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errorMultiple010Subfields);

          MarcAuthority.changeField(testData.field010.tag, testData.field010.subfield1);
          QuickMarcEditor.checkContent(testData.field010.subfield1, 5);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();

          cy.wait(3000);
          MarcAuthority.changeField(
            testData.field010.tag,
            `${testData.field010.subfield1} ${testData.field010.subfield2}`,
          );
          QuickMarcEditor.checkContent(
            `${testData.field010.subfield1} ${testData.field010.subfield2}`,
            5,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errorMultiple010Subfields);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errorMultiple010Subfields);
        },
      );
    });
  });
});
