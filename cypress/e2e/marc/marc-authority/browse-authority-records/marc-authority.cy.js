import {
  DEFAULT_JOB_PROFILE_NAMES,
  RECORD_STATUSES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
  AUTHORITY_LDR_FIELD_TYPE_DROPDOWN,
  AUTHORITY_LDR_FIELD_ELVL_DROPDOWN,
  AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN,
  APPLICATION_NAMES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { JobProfiles as SettingsJobProfiles } from '../../../../support/fragments/settings/dataImport';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const testData = {
        authority: {
          title: 'C350902Congress and foreign policy series',
          nonExactTitle: 'C350902Congress',
          searchOption: 'Uniform title',
          newField: {
            title: `Test authority ${getRandomPostfix()}`,
            tag: '901',
            content: 'venn',
          },
        },
        forC350641: {
          lcControlNumber: 'n  42008104',
          lcControlNumberUsingAllBefore: '*2008104',
          lcControlNumberUsingAllAfter: 'n  420081*',
          searchOptionA: 'Identifier (all)',
          searchOptionB: 'Keyword',
          type: 'Authorized',
        },
      };
      const querySearch = ['C350902*', 'C350667*'];
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const createdJobProfile = {
        profileName: `Update MARC authority records - 010 $a ${getRandomPostfix()}`,
        acceptedType: 'MARC',
      };
      const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
      const updatedfileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
      const propertyName = 'authority';
      let createdAuthorityID;

      before('Creating data', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        querySearch.forEach((query) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(query);
        });

        cy.createTempUser([
          Permissions.settingsDataImportEnabled.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          // get default Action profile
          ActionProfile.getActionProfilesViaApi({
            query: 'name="Default - Create MARC Authority"',
          }).then(({ actionProfiles }) => {
            // create Job profile
            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              createdJobProfile.profileName,
              actionProfiles[0].id,
            );
          });

          DataImport.uploadFileViaApi('marcAuthFileForC350902.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityID = record[propertyName].id;
              });
            },
          );
        });
      });

      beforeEach('Login to the application', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        SettingsJobProfiles.deleteJobProfileByNameViaApi(createdJobProfile.profileName);
        if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
        if (testData?.userProperties?.userId) {
          Users.deleteViaApi(testData.userProperties.userId);
        }
      });

      it(
        'C350667 Update a MARC authority record via data import. Record match with 010 $a (spitfire)',
        { tags: ['smoke', 'spitfire', 'shiftLeft', 'C350667'] },
        () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.uploadFile('test-auth-file.mrc', updatedfileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.waitLoadingList();
          JobProfiles.search(createdJobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(updatedfileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(updatedfileName);
          Logs.goToTitleLink(RECORD_STATUSES.CREATED);
          MarcAuthority.contains('MARC');
        },
      );

      it(
        'C350578 Browse existing Authorities (spitfire)',
        { tags: ['smoke', 'spitfire', 'shiftLeft', 'C350578'] },
        () => {
          const checkPresentedColumns = [
            'Authorized/Reference',
            'Heading/Reference',
            'Type of heading',
            'Authority source',
            'Number of titles',
          ];
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthority.checkPresentedColumns(checkPresentedColumns);
          MarcAuthorities.verifyRecordFound(testData.authority.title);
        },
      );

      it(
        'C350513 Browse authority - handling for when there is no exact match (spitfire)',
        { tags: ['smoke', 'spitfire', 'shiftLeft', 'C350513'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.checkSearchOptions();
          MarcAuthorityBrowse.searchBy(
            testData.authority.searchOption,
            testData.authority.nonExactTitle,
          );
          MarcAuthorityBrowse.checkHeadingReference(
            testData.authority.nonExactTitle,
            testData.authority.title,
          );
        },
      );

      it(
        'C350902 MARC fields behavior when editing "MARC Authority" record (spitfire)',
        { tags: ['smoke', 'spitfire', 'shiftLeftBroken', 'C350902'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectFirst(testData.authority.title);
          MarcAuthority.edit();
          QuickMarcEditor.check005TagIsEditable();
          QuickMarcEditor.checkFourthBoxEditable(2, false);
          QuickMarcEditor.verifyBoxValuesInLDRFieldInMarcAuthorityRecord(
            '00853',
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.C,
            AUTHORITY_LDR_FIELD_TYPE_DROPDOWN.Z,
            '\\\\a2200241',
            AUTHORITY_LDR_FIELD_ELVL_DROPDOWN.N,
            AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN['\\'],
            '\\4500',
          );
          MarcAuthority.checkNotDeletableTags('LDR');
          MarcAuthority.checkNotDeletableTags('008');
          MarcAuthority.check008Field('e');
          MarcAuthority.checkRemovedTag(9);
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(
            9,
            'Tag must contain three characters and can only accept numbers 0-9.',
          );
        },
      );

      it(
        'C350680 Duplicate records do not return when searching by Identifier (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C350680'] },
        () => {
          const searchOption = 'Identifier (all)';
          const identifier = 'n  42008104';

          MarcAuthorities.searchBy(searchOption, identifier);
          MarcAuthorities.selectFirst(testData.authority.title);
          MarcAuthority.contains(identifier);
        },
      );

      it(
        'C350641 Search MARC: support exact match searching Library of Congress Control Number - 010 field $a subfield (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C350641'] },
        () => {
          MarcAuthorities.checkSearchOptions();
          MarcAuthorities.searchBy(
            testData.forC350641.searchOptionA,
            testData.forC350641.lcControlNumber,
          );
          MarcAuthorities.checkAfterSearch(testData.forC350641.type, testData.authority.title);
          MarcAuthorities.selectFirstRecord();
          MarcAuthorities.checkFieldAndContentExistence('010', testData.forC350641.lcControlNumber);

          MarcAuthorities.searchBy(
            testData.forC350641.searchOptionA,
            testData.forC350641.lcControlNumberUsingAllBefore,
          );
          MarcAuthorities.checkAfterSearch(testData.forC350641.type, testData.authority.title);
          MarcAuthorities.searchBy(
            testData.forC350641.searchOptionA,
            testData.forC350641.lcControlNumberUsingAllAfter,
          );
          MarcAuthorities.checkAfterSearch(testData.forC350641.type, testData.authority.title);

          MarcAuthorities.searchBy(
            testData.forC350641.searchOptionB,
            testData.forC350641.lcControlNumber,
          );
          MarcAuthorities.checkAfterSearch(testData.forC350641.type, testData.authority.title);
          MarcAuthorities.searchBy(
            testData.forC350641.searchOptionB,
            testData.forC350641.lcControlNumberUsingAllBefore,
          );
          MarcAuthorities.checkAfterSearch(testData.forC350641.type, testData.authority.title);
          MarcAuthorities.searchBy(
            testData.forC350641.searchOptionB,
            testData.forC350641.lcControlNumberUsingAllAfter,
          );
          MarcAuthorities.checkAfterSearch(testData.forC350641.type, testData.authority.title);
        },
      );
    });
  });
});
