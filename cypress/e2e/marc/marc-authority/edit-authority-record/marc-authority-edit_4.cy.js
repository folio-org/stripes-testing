import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import MarcFieldProtection from '../../../../support/fragments/settings/dataImport/marcFieldProtection';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authority: {
          title: 'C353533Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
          searchOption: 'Keyword',
          tag: '100',
          rowIndex: 14,
        },
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const newFieldsArr = [
        ['245', '1', '\\', '$a Added row (must indicate)'],
        ['260', '1', '1', '$b Added row (not indicate)'],
        ['510', '\\', '\\', '$a Added row (must indicate)'],
        ['655', '1', '1', '$b Added row (must indicate)'],
        ['655', '2', '1', '$b Added row (not indicate)'],
        ['655', '1', '2', '$a Added row (not indicate)'],
        ['655', '\\', '\\', '$a Added row (must indicate)'],
      ];
      const protectedMARCFields = [
        ['245', '*', '*', 'a', '*'],
        ['260', '1', '1', 'b', 'must indicate'],
        ['510', '*', '*', '*', '*'],
        ['655', '1', '*', 'b', '*'],
        ['655', '*', '*', '*', 'Added row (must indicate)'],
      ];
      const marcFieldProtectionRules = [];

      before('create test data', () => {
        const marcFile = {
          marc: 'marcFileForC353533.mrc',
          fileName: `C353533 testMarcFile.${getRandomPostfix()}.mrc`,
        };
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          // make sure there are no duplicate authority records in the system
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C353533"',
          }).then((records) => {
            records.forEach((record) => {
              if (record.authRefType === 'Authorized') {
                MarcAuthority.deleteViaAPI(record.id);
              }
            });
          });

          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              testData.createdAuthorityID = response[0].authority.id;
            },
          );
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdAuthorityID);
        Users.deleteViaApi(testData.userProperties.userId);
        marcFieldProtectionRules.forEach((ruleID) => {
          if (ruleID) MarcFieldProtection.deleteViaApi(ruleID);
        });
      });

      it(
        'C353533 Protection of specified fields when editing "MARC Authority" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C353533'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectTitle(testData.authority.title);
          MarcAuthority.edit();
          MarcAuthority.checkInfoButton('999');
          newFieldsArr.forEach((field, index) => {
            MarcAuthority.addNewField(10 + index, field[0], field[3], field[1], field[2]);
          });
          QuickMarcEditor.saveAndCloseWithValidationWarnings();

          cy.getAdminToken();
          protectedMARCFields.forEach((marcFieldProtectionRule) => {
            MarcFieldProtection.createViaApi({
              indicator1: marcFieldProtectionRule[1],
              indicator2: marcFieldProtectionRule[2],
              subfield: marcFieldProtectionRule[3],
              data: marcFieldProtectionRule[4],
              source: 'USER',
              field: marcFieldProtectionRule[0],
            }).then((response) => {
              marcFieldProtectionRules.push(response.id);
            });
          });
          MarcAuthorities.selectTitle(testData.authority.title);
          MarcAuthority.edit();
          MarcAuthority.checkInfoButton('655', 11);
          MarcAuthority.checkInfoButton('655', 14);
          MarcAuthority.checkInfoButton('245');
          MarcAuthority.checkInfoButton('510');
          MarcAuthority.checkInfoButton('999');
        },
      );
    });
  });
});
