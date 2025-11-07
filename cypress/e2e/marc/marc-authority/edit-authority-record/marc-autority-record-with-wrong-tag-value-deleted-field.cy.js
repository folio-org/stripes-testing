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
          searchOption: 'Keyword',
          title: 'C375166 Beethoven, Ludwig van (no 010)',
        },
        field010: { tag: '010', subfield1: '$a n90635366', subfield2: '$a n90635377' },
        errorThreeCharacterMarcTag:
          'Tag must contain three characters and can only accept numbers 0-9.',
      };
      const authorityPostfix = '?authRefType=Authorized';
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFile = {
        marc: 'marcAuthFileForC375166.mrc',
        fileName: `C375166 testMarcFile.${getRandomPostfix()}.mrc`,
      };

      before('Upload files', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375166*');
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
        'C375166 Save "MARC authority" record with wrong tag value and deleted field (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C375166'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.select(`${createdAuthorityID}${authorityPostfix}`);
          MarcAuthority.edit();
          MarcAuthority.changeTag(5, '0');
          QuickMarcEditor.verifyTagValue(5, '0');
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          MarcAuthority.deleteTag(7);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errorThreeCharacterMarcTag);
          MarcAuthority.changeTag(5, '040');
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyConfirmModal();
        },
      );
    });
  });
});
