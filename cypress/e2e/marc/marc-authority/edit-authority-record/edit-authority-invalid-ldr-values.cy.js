import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import { including } from '../../../../../interactors';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authorityHeading: 'AT_C356407_MarcAuthority',
        tag100: '100',
        invalidLDRValuesInEdit: ['11a11', 'b2222'],
        defaultLDRValuesInView: ['  a22', ' 4500'],
      };

      const marcFile = {
        marc: 'marcAuthFileC356407.mrc',
        fileName: `C356407.testMarcFile.${getRandomPostfix()}.mrc`,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;

      const updatedHeading = `${testData.authorityHeading} UPD`;

      const invalidLDRValuesInFields = [
        ['records[0].content.7-16 positions', including(testData.invalidLDRValuesInEdit[0]), true],
        ['records[0].content.19-23 positions', testData.invalidLDRValuesInEdit[1], true],
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C356407_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              createdAuthorityId = response[0].authority.id;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              }, 20_000);
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C356407 Verify that invalid values at 07, 08, 10, 11, 19-23 positions of "LDR" field change to valid when user edit "MARC Authority" record. (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C356407'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();
          invalidLDRValuesInFields.forEach((fieldData) => {
            QuickMarcEditor.verifyLDRPositionsDefaultValues(...fieldData);
          });
          QuickMarcEditor.updateExistingField(testData.tag100, `$a ${updatedHeading}`);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(updatedHeading);
          testData.defaultLDRValuesInView.forEach((defaultValue) => {
            MarcAuthority.contains(defaultValue);
          });
        },
      );
    });
  });
});
